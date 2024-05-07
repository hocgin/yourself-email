import {RabbitKit, useDelete, useGet, usePost, usePut} from "@hocgin/hkit";
import {
  ChatUserScrollRo,
  ChatHistoryScrollRo,
  SendMailRo,
  UserConfigPagingRo,
  UserConfigSaveRo, ReplyMailRo
} from "@/types/http";

export class AppService {

  static pagingByUserConfig(payload: UserConfigPagingRo = {}) {
    payload.size = 1000;
    payload.page = 0;
    return usePost(`/api/user/config/paging`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.getPagingListForResult);
  }

  static addUserConfig(payload: UserConfigSaveRo) {
    return usePost(`/api/user/config`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static updateUserConfig(id: string | number, payload: UserConfigSaveRo) {
    return usePut(`/api/user/config/${id}`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static deleteByUserConfig(id: string | number) {
    return useDelete(`/api/user/config/${id}`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static state() {
    return useGet(`/api/user/state`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static scrollByMail(payload: ChatUserScrollRo) {
    if (!payload?.owner) return Promise.any({list: [], hasMore: false, nextId: null} as any);
    return usePost(`/api/mail/scroll`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits).then(RabbitKit.getScrollData);
  }

  static scrollByHistory(payload: ChatHistoryScrollRo) {

    return usePost(`/api/mail/history/scroll`, {data: {...payload}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits).then(RabbitKit.getScrollData);
  }

  static sendMail(ro: SendMailRo) {
    return usePost(`/api/mail/send`, {data: {...ro}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(RabbitKit.thenDataTryErrorIfExits);
  }

  static replyMail(id: number | string, ro: ReplyMailRo) {
    return usePost(`/api/mail/${id}/reply`, {data: {...ro}, headers: {'X-Requested-With': 'XMLHttpRequest'}})
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
