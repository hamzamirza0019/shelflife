export type AuthUser = {
  id: string
  name: string
  email: string
  role: "librarian"
}

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export type LoginResponse = TokenPair & {
  user: AuthUser
}

export type LoginCredentials = {
  email: string
  password: string
}