import {RabbitKit, usePost} from "@hocgin/hkit";
import {QueryMailScrollRo} from "@/types/http";

export class AppService {

  static scrollByMail(payload: QueryMailScrollRo) {
    return usePost(`http://127.0.0.1:3000/api/mail/scroll`, {data: {...payload}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

}
