namespace Exclusions {

  /**
   * get the list of units to exclude
   * exclusions[player][unit] = boolean
   */
  export function getList(): KeyedType<KeyedBooleans> {

    const data = SPREADSHEET.getSheetByName(SHEETS.EXCLUSIONS).getDataRange()
      .getValues() as string[][];
    const filtered = data.reduce(
      (acc: string[][], e) => {
        if (e[0].length > 0) {
          acc.push(e.slice(0, MAX_PLAYERS + 1));
        }
        return acc;
      },
      [],
    );

    const exclusions: KeyedType<KeyedBooleans> = {};

    const players = filtered.shift();  // First row holds player names
    players.shift();  // drop first column

    // For each unit rows
    for (const e of filtered) {
      const unit = e.shift();  // first column is unit names

      // For each exclusion cell
      e.forEach((x, c) => {
        const player = players[c];
        const isExcluded = Boolean(x ? x.trim() : '');  // exclude if cell is not empty?
        if (isExcluded) {
          if (!exclusions[player]) {
            exclusions[player] = {};
          }
          exclusions[player][unit] = isExcluded;
        }
      });
    }

    return exclusions;
  }

  /** remove excluded units */
  export function process(
    data: KeyedType<UnitInstances>,
    exclusions: KeyedType<KeyedBooleans>,
    event: string = undefined,  // used to validate ship alignment
  ) {
    const filter = event ? event.trim().toLowerCase() : undefined;
    for (const player in exclusions) {
      const units = exclusions[player];
      for (const unit in units) {
        if (units[unit] && data[unit] && data[unit][player]) {
          if (!filter || data[unit][player].tags.indexOf(filter) !== -1) {
            delete data[unit][player];
          }
        }
      }
      if (data[player] && Object.keys(data[player]).length === 0) {
        delete data[player];
      }
    }

    return data;
  }

}
