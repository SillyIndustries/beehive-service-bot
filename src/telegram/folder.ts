import { existsSync, readFileSync, writeFileSync } from 'fs';
import { tg, utg } from './client.js';
import { env } from '../env.js';
import { db } from '../database/index.js';
import { linkedUsers } from '../database/schema.js';

export async function tryToResolveChanPeer(who: any, bailout = false) {
  who = await who;

  try {
    try {
      const chat = await utg.joinChat(who);
      await utg.archiveChats(chat);
    } catch (e) {}

    const peer = await utg.resolvePeer(who);
    if (!peer) throw new Error('no peer');

    return peer;
  } catch (err) {
    if (!bailout)
      return await tryToResolveChanPeer(who, true);
    else
      throw new Error('cannot resolve self channel peer');
  }
}

let exportedFolderId: number;
export async function initializeFolder() {
  if (exportedFolderId)
    return exportedFolderId;

  if (existsSync('.folder_id')) {
    const folderId = +readFileSync('.folder_id', 'utf-8').trim();

    if (!isNaN(folderId) && folderId > 0) {
      console.log('using existing folder id', folderId);

      const folder = await utg.findFolder({ id: folderId });
      if (folder) {
        console.log('folder found');
        exportedFolderId = folderId;
        return exportedFolderId;
      } else {
        console.log('folder not found, creating new one');
      }
    }
  }

  const chats = await db.selectDistinctOn([linkedUsers.telegram_chat])
    .from(linkedUsers);

  const resolution = await Promise.all(
    chats.map(f => f.telegram_chat)
      .map(f => tg.getChat(f).then(c => c.username))
      .map(c => tryToResolveChanPeer(c))
  );

  const folder = await utg.createFolder({
    title: {
      _: 'textWithEntities',
      text: 'beehive',
      entities: []
    },
    emoticon: '🐝',
    includePeers: [
      await tryToResolveChanPeer(env.TELEGRAM_SELF_CHANNEL),
      ...resolution
    ],
    excludePeers: [],
  });
  console.log('created folder with id', folder.id);

  writeFileSync('.folder_id', folder.id.toString(), 'utf-8');
  exportedFolderId = folder.id;
  return exportedFolderId;
}

export async function updateExportLink() {
  const folder = await utg.findFolder({ id: exportedFolderId });
  if (!folder) {
    console.error('folder not found');
    return;
  }

  const chatlist = {
    _: 'inputChatlistDialogFilter' as 'inputChatlistDialogFilter',
    filterId: exportedFolderId,
  };

  const links = await utg.call({
    _: 'chatlists.getExportedInvites',
    chatlist
  });

  const invite = links.invites[0];
  if (!invite) {
    console.error('no export link found');
    return;
  }

  const slug = invite.url.slice(invite.url.lastIndexOf('/') + 1);
  await utg.call({
    _: 'chatlists.editExportedInvite',
    chatlist,
    slug,
    title: '[auto] beehive',
    peers: folder.includePeers,
  });

  return invite.url;
}