import type { mail, userConfig } from './schema'
import { getEmailName } from './utils'
import { IMail } from '@/types/http'

export class ConvertKit {
  static asIMail(imail: IMail) {
    if (!imail) return imail
    return {
      ...imail,
      name: imail?.name?.length > 0 ? imail?.name : getEmailName(imail?.address),
    }
  }

  static asMail(entity: (typeof mail.$inferSelect & { unreadCount?: number }) | null) {
    if (!entity) return null

    // 安全的 JSON 解析辅助函数
    const safeParse = (value: string | null | undefined, defaultValue: any = null) => {
      if (!value || value === '' || value === 'null' || value === 'undefined') return defaultValue
      try {
        return JSON.parse(value)
      } catch {
        return defaultValue
      }
    }

    return {
      id: entity.id,
      headers: safeParse(entity.headers, []),
      fromAddress: ConvertKit.asIMail(safeParse(entity.fromAddress, { address: '', name: '' })),
      sender: safeParse(entity.sender),
      replyTo: safeParse(entity.replyTo),
      toAddress: (safeParse(entity.toAddress, []) ?? []).map(ConvertKit.asIMail),
      cc: safeParse(entity.cc),
      bcc: safeParse(entity.bcc),
      returnPath: safeParse(entity.returnPath),
      deliveredTo: entity.deliveredTo || '',
      subject: entity.subject || '',
      messageId: entity.messageId || '',
      inReplyTo: entity.inReplyTo || '',
      reference: entity.reference || '',
      date: entity.date ? new Date(entity.date) : undefined,
      html: entity.html || '',
      text: entity.text || '',
      attachments: safeParse(entity.attachments),
      isRead: entity.isRead || false,
      isTrash: entity.isTrash || false,
      isArchive: entity.isArchive || false,
      isReceive: entity.isReceive || false,
      createdAt: new Date(entity.createdAt),
      lastUpdatedAt: entity.lastUpdatedAt ? new Date(entity.lastUpdatedAt) : undefined,
      unreadCount: entity?.unreadCount || 0,
      owner: entity?.owner || '',
    }
  }

  static asUserConfig(entity: typeof userConfig.$inferSelect | null) {
    if (!entity) return null
    return {
      id: entity.id,
      createdAt: new Date(entity.createdAt),
      lastUpdatedAt: entity.lastUpdatedAt ? new Date(entity.lastUpdatedAt) : undefined,
      email: entity.email || '',
      isSuperAdmin: entity.isSuperAdmin || false,
      readMail: entity.readMail ? `${entity.readMail}`.split(',') : [],
      sentMail: entity.sentMail ? `${entity.sentMail}`.split(',') : [],
    }
  }
}

