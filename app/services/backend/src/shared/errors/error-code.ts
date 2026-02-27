export enum ErrorCode {
  Unauthorized = "common.unauthorized",
  Forbidden = "common.forbidden",
  NotFound = "common.not_found",
  InvalidParams = "common.invalid_params",
  Conflict = "common.conflict",
  ServerError = "common.server_error",
  AuthUsernameTaken = "auth.username_taken",
  AuthInvalidCredentials = "auth.invalid_credentials",
  AuthTokenRevoked = "auth.token_revoked",

  // 私信模块
  SelfConversation = "message.self_conversation",
  NotParticipant = "message.not_participant"
}
