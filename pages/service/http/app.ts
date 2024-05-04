import {RabbitKit, useGet, usePost} from "@hocgin/hkit";
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

}
