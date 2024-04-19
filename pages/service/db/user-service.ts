import type {D1Database} from "@cloudflare/workers-types";
import type {ListAccountVo} from "@/types/http";

export class UserService {

  static async listAccountsByUser(client: D1Database) {
    return [{
      "address": "hocgin@gmail.com",
      "name": "夏不来"
    }, {
      "address": "cc@hocg.in",
      "name": ""
    }] as ListAccountVo
  }
}
