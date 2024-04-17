import {RabbitKit, usePost} from "@hocgin/hkit";
import {QueryChatScrollRo, QueryMailScrollRo} from "@/types/http";

export class AppService {

  static scrollByMail(payload: QueryMailScrollRo) {
    return usePost(`/api/mail/scroll`, {data: {...payload}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static scrollByChat(payload: QueryChatScrollRo) {
    return usePost(`/api/chat/scroll`, {data: {...payload}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

}
