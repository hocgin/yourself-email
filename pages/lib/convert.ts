import type {Mail, UserConfig} from "@prisma/client";

export class ConvertKit {

  static asMail(entity: (Mail | any)) {
    return {
      id: entity.id,
      headers: JSON.parse(entity.headers),
      fromAddress: JSON.parse(entity.from_address),
      sender: JSON.parse(entity.sender),
      replyTo: JSON.parse(entity.reply_to),
      toAddress: JSON.parse(entity.to_address),
      cc: JSON.parse(entity.cc),
      bcc: JSON.parse(entity.bcc),
      returnPath: JSON.parse(entity.return_path),
      deliveredTo: entity.delivered_to,
      subject: entity.subject,
      messageId: entity.message_id,
      inReplyTo: entity.in_reply_to,
      reference: entity.reference,
      date: entity.date,
      html: entity.html,
      text: entity.text,
      attachments: entity.attachments,
      isRead: entity.is_read,
      isTrash: entity.is_trash,
      isArchive: entity.is_archive,
      createdAt: entity.created_at,
      lastUpdatedAt: entity.last_updated_at,
      unreadCount: entity?.unread_count,
    } as const;
  }

  static asUserConfig(entity: (UserConfig | any)) {
    return {
      id: entity.id,
      createdAt: entity.created_at,
      lastUpdatedAt: entity.last_updated_at,
      email: entity.email,
      isSuperAdmin: entity.is_super_admin,
      readMail: `${entity.read_mail}`.split(','),
      sentMail: `${entity.read_mail}`.split(','),
    };
  }
}
