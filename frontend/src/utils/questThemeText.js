/**
 * Maps seed quest titles to enchanted (princess/fairy-tale) alternate
 * titles and descriptions, used when a "girl" colour theme is active.
 */

const ENCHANTED_THEMES = ['rose', 'galaxy', 'sunshine'];

const ENCHANTED_MAP = {
  'The Chamber of Rest': {
    title: 'The Royal Chambers',
    description:
      'Enter your royal chambers and restore the kingdom\'s beauty. Arrange the pillows, smooth the silken blankets, and create a haven fit for a princess.',
  },
  "Dishwasher's Oath": {
    title: 'The Crystal Goblet Ceremony',
    description:
      'The crystal goblets and enchanted plates from the royal banquet await your care. Polish each treasure and return it to its rightful place in the palace cupboards.',
  },
  "The Scholar's Burden": {
    title: 'The Academy Scrolls',
    description:
      'The Royal Academy has sent scrolls of wisdom for your study. Sit at your enchanted desk, open your spellbooks, and master the magical lessons within.',
  },
  'Cauldron Duty': {
    title: 'The Royal Feast',
    description:
      'The palace feast must be prepared! Help the Royal Chef arrange the ingredients, stir the magical broth, and set the grand table for the royal court.',
  },
  'The Folding Ritual': {
    title: 'The Enchanted Wardrobe',
    description:
      'Freshly enchanted garments have arrived from the Fairy Laundress. Sort them by colour, fold them with care, and deliver them to each royal wardrobe.',
  },
  "Beast Keeper's Round": {
    title: 'Royal Pet Care',
    description:
      'The royal pets and magical creatures need your gentle care. Fill their crystal bowls, refresh their enchanted waters, and tidy their cosy nests.',
  },
  'Garden of the Ancients': {
    title: 'The Enchanted Gardens',
    description:
      'The enchanted palace gardens await a gentle hand. Tend the fairy roses, water the wishing flowers, and sweep the sparkling garden paths.',
  },
  'The Porcelain Throne': {
    title: 'The Royal Bathhouse',
    description:
      'The Royal Bathhouse needs your attention! Polish the enchanted mirrors, scrub the crystal basin, and make everything sparkle like starlight.',
  },
  'Sweeping the Great Hall': {
    title: 'Sparkling the Ballroom',
    description:
      'Fairy dust and stardust have settled in the grand ballroom. Take up your enchanted broom and restore the floors to their sparkling splendour.',
  },
  "Merchant's Errand": {
    title: 'Market Day Adventure',
    description:
      'The palace needs supplies from the village! Accompany the Royal Steward on this exciting journey through the enchanted marketplace.',
  },
};

/**
 * Return a themed title for a chore.
 * Falls back to the original title if no override exists.
 */
export function themedTitle(originalTitle, colorTheme) {
  if (!ENCHANTED_THEMES.includes(colorTheme)) return originalTitle;
  return ENCHANTED_MAP[originalTitle]?.title || originalTitle;
}

/**
 * Return a themed description for a chore.
 * Falls back to the original description if no override exists.
 */
export function themedDescription(originalTitle, originalDescription, colorTheme) {
  if (!ENCHANTED_THEMES.includes(colorTheme)) return originalDescription;
  return ENCHANTED_MAP[originalTitle]?.description || originalDescription;
}
