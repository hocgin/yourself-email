export interface Message {
  type: MessageType;
  value?: any
}

export enum MessageType {
  RefreshMail = 'RefreshMail',
  RefreshUserConfig = 'RefreshUserConfig',
  UpdateMail = 'UpdateMail',
}

export class UnAccessError extends Error {
  constructor() {
    super('NoPermissionToAccessThisResource');
  }
}
