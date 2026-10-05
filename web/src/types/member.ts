export type MemberRecord = {
  _id: string
  name: string
  email: string
  membershipId: string
  joinedDate: string
  createdAt: string
  updatedAt: string
}

export type MemberInput = {
  name: string
  email: string
  membershipId: string
}

export type MemberView = MemberRecord & {
  borrowedBooks: number
}