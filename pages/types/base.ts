export interface Message {
  type: MessageType;
  value?: any
}

export enum MessageType {
  RefreshMail = 'RefreshMail',
  UpdateMail = 'UpdateMail',
}
