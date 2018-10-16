/** API Functions to pull data from swgoh.gg */

interface SwgohGgUnit {
  data: {
    base_id: string;
    gear: {
      base_id: string;
      is_obtained: boolean;
      slot: number;
    }[];
    gear_level: number;
    level: number;
    power: number;
    rarity: number;
    stats: {[key: string]: number};
    url: string;
    zeta_abilities: string[];
  };
}

interface SwgohGgPlayerData {
  ally_code: number;
  arena_leader_base_id: string;
  arena_rank: number;
  character_galactic_power: number;
  galactic_power: number;
  level: number;
  name: string;
  ship_galactic_power: number;
  url: string;
}

interface SwgohGgUnitResponse {
  ability_classes: string[];
  alignment: string;
  base_id: string;
  categories: string[];
  combat_type: number;
  description: string;
  gear_levels: {
    tier: number;
    gear: string[];
  }[];
  image: string;
  name: string;
  pk: number;
  power: number;
  role: string;
  url: string;
}

interface SwgohGgGuildResponse {
  data: {
    name: string;
    member_count: number;
    galactic_power: number;
    rank: number;
    profile_count: number;
    id: number;
  };
  players: SwgohGgPlayerResponse[];
}

interface SwgohGgPlayerResponse {
  data: SwgohGgPlayerData;
  units: SwgohGgUnit[];
}

/** Get the guild id */
function getSwgohGgGuildId_(): number {
  const metaSWGOHLinkCol = 1;
  const metaSWGOHLinkRow = 2;

  const guildLink = SPREADSHEET.getSheetByName(SHEETS.META)
    .getRange(metaSWGOHLinkRow, metaSWGOHLinkCol)
    .getValue() as string;
  const parts = guildLink.split('/');
  // TODO: input check
  const guildId = Number(parts[4]);

  return guildId;
}

/**
 * Send request to SWGoH.gg API
 * @param link API 'GET' request
 * @param errorMsg Message to display on error
 * @returns JSON object response
 */
function requestSwgohGgApi_<T>(
  link: string,
  errorMsg: string = 'Error when retreiving data from swgoh.gg API',
): T {
  let json;
  try {
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      // followRedirects: true,
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(link, params);
    json = JSON.parse(response.getContentText());
  } catch (e) {
    // TODO: centralize alerts
    UI.alert(errorMsg, e, UI.ButtonSet.OK);
  }

  return json || undefined;
}

/**
 * Pull base Character data from SWGoH.gg
 * @returns Array of Characters with [tags, baseId, name]
 */
function getHeroListFromSwgohGg_(): UnitDeclaration[] {
  const json = requestSwgohGgApi_<SwgohGgUnitResponse[]>(
    'https://swgoh.gg/api/characters/',
  );
  const mapping = (e: SwgohGgUnitResponse) => {
    const tags = [e.alignment, e.role, ...e.categories]
      .join(' ')
      .toLowerCase();
    const unit: UnitDeclaration = {
      tags,
      baseId: e.base_id,
      name: e.name,
    };
    return unit;
  };

  return json.map(mapping);
}

/**
 * Pull base Ship data from SWGoH.gg
 * @returns Array of Characters with [tags, baseId, name]
 */
function getShipListFromSwgohGg_(): UnitDeclaration[] {
  const json = requestSwgohGgApi_<SwgohGgUnitResponse[]>(
    'https://swgoh.gg/api/ships/',
  );
  const mapping = (e: SwgohGgUnitResponse) => {
    const tags = [e.alignment, e.role, ...e.categories]
      .join(' ')
      .toLowerCase();
    const unit: UnitDeclaration = {
      tags,
      baseId: e.base_id,
      name: e.name,
    };
    return unit;
  };

  return json.map(mapping);
}

/** Create guild API link */
function getSwgohGgGuildApiLink_(guildId: number): string {
  const link = `https://swgoh.gg/api/guild/${guildId}/`;

  // TODO: data check
  return link;
}

/**
 * Pull Guild data from SWGoH.gg
 * Units name and tags are not populated
 * @returns Array of Guild members and their units data
 */
function getGuildDataFromSwgohGg_(guildId: number): PlayerData[] {
  const json = requestSwgohGgApi_<SwgohGgGuildResponse>(
    getSwgohGgGuildApiLink_(guildId),
  );
  const members: PlayerData[] = [];
  for (const member of json.players) {
    const unitArray: {[key: string]: UnitInstance} = {};
    for (const e of member.units) {
      const d = e.data;
      const baseId = d.base_id;
      unitArray[baseId] = {
        baseId,
        gearLevel: d.gear_level,
        level: d.level,
        power: d.power,
        rarity: d.rarity,
      };
    }
    members.push({
      gp: member.data.galactic_power,
      heroesGp: member.data.character_galactic_power,
      level: member.data.level,
      allyCode: Number(member.data.url.match(/(\d+)/)[1]),
      // link: member.data.url,
      name: member.data.name,
      shipsGp: member.data.ship_galactic_power,
      units: unitArray,
    });
  }

  return members;
}

/** Create player API link */
function getSwgohGgPlayerApiLink_(allyCode: number): string {
  const link = `https://swgoh.gg/api/player/${allyCode}/`;

  // TODO: data check
  return link;
}

/**
 * Pull Player data from SWGoH.gg
 * Units name and tags are not populated
 * @returns Player data, including its units data
 */
function getPlayerDataFromSwgohGg_(allyCode: number): PlayerData {
  const json = requestSwgohGgApi_<SwgohGgPlayerResponse>(
    getSwgohGgPlayerApiLink_(allyCode),
  );
  const data = json.data;
  const player: PlayerData = {
    allyCode: data.ally_code,
    gp: data.galactic_power,
    heroesGp: data.character_galactic_power,
    level: data.level,
    link: data.url,
    name: data.name,
    shipsGp: data.ship_galactic_power,
    units: {},
  };
  const units = player.units;
  for (const o of json.units) {
    const d = o.data;
    const baseId = d.base_id;
    units[baseId] = {
      baseId,
      gearLevel: d.gear_level,
      level: d.level,
      power: d.power,
      rarity: d.rarity,
    };
  }

  return player;
}
