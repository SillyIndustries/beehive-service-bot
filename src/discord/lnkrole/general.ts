import { env } from '../../env.js';
import { client } from '../client.js';
import { getAllDiscordIdsForTelegramChat, getDiscordAccessTokenCached, updateDiscordTokens } from './storage.js';
import { Tokens } from './types.js';

export function getOAuthUrl() {
  if (!client.application) throw new Error;

  const state = crypto.randomUUID();

  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', client.application?.id);
  url.searchParams.set('redirect_uri', env.DISCORD_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'role_connections.write identify');
  url.searchParams.set('prompt', 'consent');
  return { state, url: url.toString() };
}

export async function getOAuthTokens(code: string) {
  if (!client.application) throw new Error;

  const url = 'https://discord.com/api/v10/oauth2/token';
  const body = new URLSearchParams({
    client_id: client.application.id,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.DISCORD_REDIRECT_URI,
  });

  const response = await fetch(url, {
    body,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  } else
    throw new Error(`Error fetching OAuth tokens: [${response.status}] ${response.statusText}`);
}

export async function getDiscordAccessToken(userId: string) {
  const tokens = await getDiscordAccessTokenCached(userId);

  if (Date.now() > tokens.expires_at) {
    if (!client.application) throw new Error;

    const url = 'https://discord.com/api/v10/oauth2/token';
    const body = new URLSearchParams({
      client_id: client.application.id,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    });
    const response = await fetch(url, {
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.ok) {
      const tokens = await response.json();
      tokens.expires_at = Date.now() + tokens.expires_in * 1000;
      await updateDiscordTokens(userId, tokens);
      return tokens.access_token;
    } else
      throw new Error(`Error refreshing access token: [${response.status}] ${response.statusText}`);
  }

  return tokens.access_token;
}

export async function getUserData(tokens: Tokens) {
  const url = 'https://discord.com/api/v10/oauth2/@me';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data;
  } else
    throw new Error(`Error fetching user data: [${response.status}] ${response.statusText}`);
}

export async function pushMetadata(userId: string, username: string, metadata: any) {
  if (!client.application) throw new Error;

  const url = `https://discord.com/api/v10/users/@me/applications/${client.application.id}/role-connection`;
  const accessToken = await getDiscordAccessToken(userId);

  const body = {
    platform_name: 'Telegram Channel',
    platform_username: '@' + username,
    metadata,
  };
  const response = await fetch(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok)
    throw new Error(`Error pushing discord metadata: [${response.status}] ${response.statusText}`);
}

export async function pushMetadataForAllMembersOfTelegramChat(telegramChat: number, username: string, metadata: any) {
  if (!client.application) throw new Error;

  const discordIds = await getAllDiscordIdsForTelegramChat(telegramChat);
  for (const discordId of discordIds) {
    try {
      await pushMetadata(discordId, username, metadata);
    } catch (err) {
      console.error(`Error pushing metadata for Discord user ${discordId}:`, err);
    }
  }
}

export async function revokeOAuth2(userId: string) {
  if (!client.application) throw new Error;

  const tokens = await getDiscordAccessTokenCached(userId);

  const url = 'https://discord.com/api/v10/oauth2/token/revoke';
  const body = new URLSearchParams({
    token: tokens.refresh_token,
    token_type_hint: 'refresh_token',
  });

  const response = await fetch(url, {
    body,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${client.application.id}:${env.DISCORD_CLIENT_SECRET}`).toString('base64')}`,
    },
  });

  if (!response.ok)
    throw new Error(`Error revoking OAuth2 tokens: [${response.status}] ${response.statusText}`);
}