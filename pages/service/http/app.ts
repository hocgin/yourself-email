import {RabbitKit, useGet, usePost} from "@hocgin/hkit";
import {ListAccountVo, QueryMailScrollRo, QueryHistoryScrollRo, SendMailRo} from "@/types/http";
import {IScroll} from "@hocgin/nextjs-kit";

export class AppService {

  static listAccounts(): Promise<ListAccountVo> {
    return useGet(`/api/user/accounts`)
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static scrollByMail(payload: QueryMailScrollRo) {
    if (!payload?.owner) return Promise.any({list: [], hasMore: false, nextId: null} as any);
    return usePost(`/api/mail/scroll`, {data: {...payload}})
      .then(RabbitKit.thenDataTryErrorIfExits).then(RabbitKit.getScrollData);
  }

  static scrollByHistory(payload: QueryHistoryScrollRo) {
    return usePost(`/api/history/scroll`, {data: {...payload}})
      .then(RabbitKit.thenDataTryErrorIfExits).then(RabbitKit.getScrollData);
  }

  static sendMail(ro: SendMailRo) {
    return usePost(`/api/mail/send`, {data: {...ro}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

}
