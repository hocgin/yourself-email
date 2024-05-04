import {RabbitKit, useGet, usePost, usePut} from "@hocgin/hkit";
import {ListAccountVo, ChatUserScrollRo, ChatHistoryScrollRo, SendMailRo} from "@/types/http";
import {IScroll} from "@hocgin/nextjs-kit";

export class AppService {

  static listAccounts(): Promise<ListAccountVo> {
    return useGet(`/api/user/account`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static scrollByMail(payload: ChatUserScrollRo) {
    if (!payload?.owner) return Promise.any({list: [], hasMore: false, nextId: null} as any);
    return usePost(`/api/mail/scroll`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits).then(RabbitKit.getScrollData);
  }

  static scrollByHistory(payload: ChatHistoryScrollRo) {
    return usePost(`/api/history/scroll`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits).then(RabbitKit.getScrollData);
  }

  static sendMail(ro: SendMailRo) {
    return usePost(`/api/mail/send`, {data: {...ro}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static getMail(id: number | string) {
    return useGet(`/api/mail/${id}`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static unread(id: string) {
    return usePut(`/api/mail/${id}/unread`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static setTrash(id: string, isTrash: boolean) {
    return usePut(`/api/mail/${id}/${isTrash ? 'trash' : 'untrash'}`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static setArchive(id: string, isArchive: boolean) {
    return usePut(`/api/mail/${id}/${isArchive ? 'archive' : 'unarchive'}`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }
}
