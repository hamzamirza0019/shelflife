# Q3 — System Design

## Assumptions

- ShelfLife supports approximately 500 campus libraries and 2 million members.
- Each book and borrowing record belongs to a particular campus library.
- MongoDB is the primary source of truth.
- Redis is used only as a cache and is not required for correctness.
- The API layer is stateless so that multiple instances can be added or removed easily.
- Non-critical background tasks can be handled asynchronously.

---

## (a) High-Level Architecture

ShelfLife can use a React + TypeScript client, a CDN for frontend assets, a load balancer, multiple stateless Express API instances, Redis for caching, and MongoDB as the primary database.

The client sends API requests through the load balancer. The load balancer distributes requests across multiple API instances. The API instances communicate with Redis for frequently accessed data and MongoDB for persistent data.

A message queue can be added for non-critical asynchronous operations such as notifications and report generation.

### Architecture Diagram

```mermaid
flowchart LR
    Client["React + TypeScript Client"]

    CDN["CDN / Static Hosting"]
    LB["Load Balancer"]

    API1["Express API 1"]
    API2["Express API 2"]
    APIN["Express API N"]

    Redis[("Redis Cache")]
    Mongo[("MongoDB Cluster")]

    Queue["Message Queue"]
    Worker["Background Worker"]

    Client --> CDN
    Client --> LB

    LB --> API1
    LB --> API2
    LB --> APIN

    API1 --> Redis
    API2 --> Redis
    APIN --> Redis

    API1 --> Mongo
    API2 --> Mongo
    APIN --> Mongo

    API1 --> Queue
    API2 --> Queue
    APIN --> Queue

    Queue --> Worker

Components
- React + TypeScript Client: Provides the user interface for searching books, issuing books, returning books, and viewing borrowing history.
- CDN: Serves frontend static assets efficiently from locations closer to users.
- Load Balancer: Distributes incoming API requests across multiple API instances.
- Express API Layer: Handles authentication, validation, business logic, and REST API requests.
- Redis: Caches frequently requested data and reduces repeated database reads.
- MongoDB: Stores books, members, and borrowing records and acts as the source of truth.
- Message Queue: Handles non-critical asynchronous tasks without blocking API requests.
- Background Worker: Processes queued tasks such as notifications or report generation.
The API servers are stateless, which makes horizontal scaling easier.
(b) Single MongoDB Cluster or Sharding?
Initially, I would keep a single MongoDB cluster configured as a replica set rather than immediately introducing sharding.
Although the system needs to support 500 libraries and approximately 2 million members, this scale does not automatically require sharding. A properly sized MongoDB cluster can handle this workload while being simpler to operate and maintain.
A replica set also provides high availability and supports MongoDB transactions, which are useful for the issue-book operation.
If the system grows beyond the storage or throughput capacity of a single cluster, MongoDB sharding can be introduced later.
Proposed Shard Key
If sharding becomes necessary, I would use libraryId as the shard-key component for both the Book and BorrowRecord collections.
Book:
{ libraryId: 1, ... }

BorrowRecord:
{ libraryId: 1, ... }

Justification
Most operations in ShelfLife are naturally associated with a particular library.
For example:
- Searching books in a particular library
- Checking book availability
- Viewing borrowing history
- Issuing and returning books
Using libraryId allows data to be distributed across libraries and helps keep library-specific operations targeted to the relevant shard.
I would avoid using fields such as genre as a shard key because they have relatively low cardinality and could result in uneven data distribution.
A monotonically increasing field would also be undesirable because it can create write hotspots.
Therefore:
- Initially: Use a single MongoDB replica-set cluster.
- If future scale requires it: Introduce sharding using libraryId.
(c) Most Read-Heavy Operation and Caching Strategy
The most read-heavy operation is expected to be book search and listing.
Users frequently search for books by title and filter them by genre. During the first week of a semester, this operation can generate a large number of repeated read requests.
What to Cache
I would cache the results of book search/list queries in Redis.
The cache key should contain the parameters that affect the result.
For example:
books:title=java:genre=programming:page=1

The cached value would contain the corresponding book-list response.
Cache Invalidation
The relevant cache entries should be invalidated when book data changes.
Cache invalidation should occur when:
- A book is created.
- A book is updated.
- A book is deleted.
- A book is issued.
- A book is returned.
Issue and return operations are particularly important because they change availableCopies.
TTL
I would use a short TTL of approximately 1–5 minutes.
This provides a balance between reducing database load and avoiding stale book information.
MongoDB remains the source of truth. If Redis is unavailable, the application can fall back to MongoDB.
(d) Preventing availableCopies from Becoming Negative
The issue-book operation must remain correct even when multiple users try to issue the last available copy at the same time.
I would use an atomic conditional update in MongoDB.
The database should decrement availableCopies only when at least one copy is available.
For example:
db.books.updateOne(
  {
    _id: bookId,
    availableCopies: { $gt: 0 }
  },
  {
    $inc: { availableCopies: -1 }
  }
)

The condition and decrement are performed atomically by MongoDB.
Concurrent Request Example
Suppose:
availableCopies = 1

Two users try to issue the book at almost exactly the same time.
Request A
    ↓
availableCopies > 0
    ↓
decrement succeeds
    ↓
availableCopies = 0


Request B
    ↓
availableCopies > 0 is now false
    ↓
update fails

Therefore, availableCopies can never become -1.
The API checks the result of the update. If no document was modified, it returns an appropriate error indicating that no copy is currently available.
Why Not an Application-Level Check?
A simple application-level implementation such as:
1. Read availableCopies
2. Check whether it is greater than 0
3. Decrease availableCopies

is unsafe under concurrency.
For example, two requests could both read:
availableCopies = 1

before either request performs the decrement. Both requests could then proceed, causing the inventory to become incorrect.
The atomic database operation avoids this race condition.
Why Choose Atomic Update Over Other Alternatives?
Distributed lock
A distributed lock could prevent concurrent access, but it introduces additional infrastructure and complexity. It is unnecessary when MongoDB can enforce the required condition atomically.
Optimistic locking
Optimistic locking can detect conflicting updates, but failed requests may need retries. The atomic conditional update directly expresses the business rule and is simpler for this operation.
Queue
A queue could serialize issue requests, but it would introduce additional latency and infrastructure for an operation that needs a quick synchronous response.
Therefore, an atomic conditional MongoDB update is the preferred mechanism.
For the complete issue-book operation, the inventory update and creation of the BorrowRecord should be performed inside a MongoDB transaction so that either both operations succeed or both are rolled back.
(e) Handling the 10× Semester Traffic Spike
ShelfLife experiences approximately 10× normal traffic during the first week of every semester, especially for book search and issue/return operations.
The system should use horizontal scaling and autoscaling rather than permanently provisioning infrastructure for the peak workload.
Normal Traffic
During normal periods, the system can run a small number of API instances:
              Load Balancer
                   |
              +----+----+
              |         |
             API       API
              |         |
         Redis + MongoDB

Semester Traffic
When traffic increases, additional stateless API instances can be started automatically:
                 Load Balancer
                       |
        +------+------+------+------+------+
        |      |      |      |      |      |
       API    API    API    API    API    ...
                       |
                 Redis + MongoDB

Autoscaling
The number of API instances can be increased based on metrics such as:
- CPU utilisation
- Request rate
- Response latency
- Number of concurrent requests
Because the API servers are stateless, new instances can be added without requiring users to connect to a specific server.
Role of Redis
Redis can absorb repeated book-search and listing requests, reducing the number of requests reaching MongoDB.
This is particularly useful during the semester spike when many users may search for the same books.
Scaling Down
After the first week of the semester, traffic should return closer to normal levels.
The autoscaling system can then remove the additional API instances.
Therefore, ShelfLife can handle the 10× traffic spike without maintaining peak infrastructure throughout the entire year.
Final Design Summary
Requirement	Design
Client	React + TypeScript
Frontend delivery	CDN
API layer	Stateless Express instances
Traffic distribution	Load Balancer
Primary database	MongoDB
Initial MongoDB architecture	Replica Set
Future database scaling	Sharding if required
Shard key	libraryId for Book and BorrowRecord
Most read-heavy operation	Book search/listing
Cache	Redis
Cache TTL	1–5 minutes
Cache invalidation	Book changes, issue, and return
Inventory concurrency	Atomic conditional MongoDB update
Issue-book consistency	MongoDB transaction
Async processing	Message Queue + Workers
Peak traffic handling	Horizontal autoscaling
Peak capacity strategy	Scale out during semester, scale down afterward


Conclusion
The proposed architecture keeps MongoDB as the source of truth while using Redis to reduce read load and improve response time. A single MongoDB replica-set cluster is sufficient initially, while sharding can be introduced if future growth requires horizontal database scaling.
The issue-book operation uses an atomic conditional update to guarantee that availableCopies never becomes negative, even when concurrent requests attempt to issue the last copy. MongoDB transactions maintain consistency between inventory and borrowing records.
Finally, stateless API instances behind a load balancer can be horizontally scaled during the semester spike and scaled back down afterward. This allows ShelfLife to handle approximately 10× traffic without permanently over-provisioning infrastructure.