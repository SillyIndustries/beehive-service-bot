import { WizardScene, WizardSceneAction } from '@mtcute/dispatcher';
import { html, InputMedia } from '@mtcute/node';

import * as lnkrole from '../../../discord/lnkrole/main.js';

interface VerificationSceneState {
  telegram_user: number;
  discord_id: string;
  access_token: string;
  expires_at: number;
  refresh_token: string;
  telegram_channel?: number;
}

export const verificationScene = new WizardScene<VerificationSceneState>('VERIFICATION_SCENE');

verificationScene.setDefaultState({} as unknown as VerificationSceneState);

verificationScene.addStep(async (msg) => {
  await msg.answerText(html`
  <b>Now I know who you are!</b><br><br>

  But we're not done yet. You must:<br>
  1) <b>Invite me to your channel and promote me to admin (‼️)</b><br>
  2) Write the @ of your channel to me so I can check.<br><br>

  If I get removed from your channel or you leave the channel, you will lose the connection.<br><br>

  <b>Disclaimer:</b>
  <blockquote>
    This bot WILL NOT be used to post any content in your Telegram channel, and is strictly used for metadata
    and authentication purposes only. If you are still unsure, promote me to admin and untick all my admin perms.
  </blockquote>
  `);

  return WizardSceneAction.Next;
});

verificationScene.addStep(async (msg) => {
  try {
    const getter = await verificationScene.getGlobalState<VerificationSceneState>(msg);
    const state = await getter.get();
    if (!state) throw new Error;

    const members = await msg.client.getChatMembers(msg.text, { type: 'admins' });

    if (!members.some(x => x.user.id === state.telegram_user))
      throw new Error;

    await lnkrole.storeDiscordTokens(state.discord_id, {
      access_token: state.access_token,
      refresh_token: state.refresh_token,
      expires_at: state.expires_at,
    });

    const resolution = await msg.client.getFullChat(msg.text);
    if (!resolution)
      throw new Error;

    await lnkrole.associateDiscordWithTelegram(
      state.discord_id,
      state.telegram_user,
      resolution.id
    );
    await lnkrole.pushMetadata(
      state.discord_id,
      resolution.username || '???',
      {
        subs: resolution.membersCount || 0,
      }
    );
  } catch (err) {
    console.log(err);
    await msg.replyText(html`<b>Couldn't resolve the channel or whether or not you are an admin of it. Try again!</b>`);
    return WizardSceneAction.Stay;
  }

  await msg.react({ emoji: '👌' });
  await msg.replyMedia(InputMedia.sticker('CAACAgIAAxkBAAEPPlxorc5lV5ic9i6dhY-AxB-9-JhRTgACLUIAAoUkWUjcXNSdoEo60TYE'));
  await msg.replyText(html`<b>Very good!</b> You may now continue to Discord.`);
  return WizardSceneAction.Exit;
});