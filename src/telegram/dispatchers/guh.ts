import { Dispatcher, filters } from '@mtcute/dispatcher';
import * as lnkrole from '../../discord/lnkrole/main.js';

export const cMUDp = Dispatcher.child();

cMUDp.onChatMemberUpdate(
  filters.chatMember('joined'),
  async (upd) => {
    if (upd.isSelf || upd.chat.inputPeer._ !== 'inputPeerChannel')
      return;

    console.log('got added to some channel', upd.chat.id);
    const fullChat = await upd.client.getFullChat(upd.chat.id);
    await lnkrole.pushMetadataForAllMembersOfTelegramChat(
      upd.chat.id,
      upd.chat.username || '',
      {
        subs: fullChat.membersCount,
      }
    );
  }
);

cMUDp.onChatMemberUpdate(
  filters.or(
    filters.chatMember('left'),
    filters.chatMember('kicked')
  ),
  async (upd) => {
    if (upd.chat.inputPeer._ !== 'inputPeerChannel')
      return;

    if (upd.isSelf) {
      console.log('left from some channel', upd.chat.id);
      await lnkrole.removeAllAssociationsForTelegramChat(upd.chat.id);
      return;
    }

    console.log('some user left from some channel', upd.chat.id, upd.user.id);
    const fullChat = await upd.client.getFullChat(upd.chat.id);
    await lnkrole.pushMetadataForAllMembersOfTelegramChat(upd.chat.id, upd.chat.username || '', {
      subs: fullChat.membersCount || 0,
    });
    if (upd.oldMember?.status === 'admin' || upd.oldMember?.status === 'creator') {
      await lnkrole.removeAllAssociationsForTelegram(upd.chat.id, upd.user.id);
      return;
    }
  }
);

cMUDp.onChatMemberUpdate(
  filters.chatMember('demoted'),
  async (upd) => {
    if (upd.chat.inputPeer._ !== 'inputPeerChannel')
      return;

    console.log('some user demoted from admin in some channel', upd.chat.id, upd.user.id);
    await lnkrole.removeAllAssociationsForTelegram(upd.chat.id, upd.user.id);
  }
);