/**
 * Build script for locale-en models.
 *
 * Generates:
 * - models/markov.bin — trigram Markov model trained on English names
 * - models/names.bloom — bloom filter of known English names
 *
 * Run with: npx tsx packages/locale-en/src/build-models.ts
 *
 * In production, use @pakhad/train CLI to build from larger corpora.
 * This script uses a curated starter set so the package works out of the box.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = resolve(__dirname, '../models');

// Curated English name list — US Census Bureau top names + UK ONS common names.
// Lowercase, deduplicated. This is a starter set; production should use
// full census data (see corpora/README.md for sourcing instructions).
const ENGLISH_NAMES: string[] = [
  // Male names (US Census top 50 + common variants)
  'james', 'robert', 'john', 'michael', 'david', 'william', 'richard',
  'joseph', 'thomas', 'charles', 'christopher', 'daniel', 'matthew',
  'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
  'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward',
  'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
  'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin',
  'samuel', 'raymond', 'gregory', 'frank', 'alexander', 'patrick',
  'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan',
  'henry', 'peter', 'zachary', 'douglas', 'harold', 'carl', 'arthur',
  'gerald', 'roger', 'keith', 'jeremy', 'terry', 'lawrence', 'albert',
  'sean', 'austin', 'joe', 'willie', 'jesse', 'ralph', 'billy',
  'bruce', 'bryan', 'eugene', 'russell', 'bobby', 'mason', 'philip',
  'louis', 'howard', 'vincent', 'fred', 'wayne', 'randy', 'roy',
  'johnny', 'eugene', 'alan', 'noah', 'ethan', 'liam', 'oliver',

  // Female names (US Census top 50 + common variants)
  'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth',
  'susan', 'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty',
  'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily',
  'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie',
  'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela',
  'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen',
  'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn',
  'janet', 'catherine', 'maria', 'heather', 'diane', 'ruth', 'julie',
  'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren', 'christina',
  'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah',
  'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison',
  'frances', 'kathryn', 'janice', 'jean', 'abigail', 'alice', 'judy',
  'sophia', 'grace', 'denise', 'amber', 'doris', 'marilyn', 'danielle',
  'beverly', 'isabella', 'theresa', 'diana', 'natalie', 'brittany',
  'charlotte', 'marie', 'kayla', 'alexis', 'lori',

  // UK ONS common names
  'oliver', 'harry', 'george', 'charlie', 'freddie', 'alfie', 'oscar',
  'archie', 'leo', 'teddy', 'tommy', 'finley', 'reuben', 'theo',
  'amelia', 'isla', 'ava', 'mia', 'ivy', 'lily', 'rosie', 'florence',
  'willow', 'poppy', 'elsie', 'daisy', 'sienna', 'freya', 'phoebe',
  'evie', 'harper', 'ruby', 'matilda', 'alice', 'luna', 'robyn',

  // Common surnames (helps with name field detection)
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
  'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez',
  'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin',
  'lee', 'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark',
  'ramirez', 'lewis', 'robinson', 'walker', 'young', 'allen', 'king',
  'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores', 'green',
  'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell',
  'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner', 'diaz',
  'parker', 'cruz', 'edwards', 'collins', 'reyes', 'stewart', 'morris',
  'morales', 'murphy', 'cook', 'rogers', 'gutierrez', 'ortiz', 'morgan',
  'cooper', 'peterson', 'bailey', 'reed', 'kelly', 'howard', 'ramos',
  'kim', 'cox', 'ward', 'richardson', 'watson', 'brooks', 'chavez',
  'wood', 'james', 'bennett', 'gray', 'mendoza', 'ruiz', 'hughes',
  'price', 'alvarez', 'castillo', 'sanders', 'patel', 'myers', 'long',
  'ross', 'foster', 'jimenez', 'powell', 'jenkins', 'perry', 'russell',
  'sullivan', 'bell', 'coleman', 'butler', 'henderson', 'barnes',
  'gonzales', 'fisher', 'vasquez', 'simmons', 'griffin', 'mcdonald',

  // Names that other libraries false-positive on (regression prevention)
  'siobhan', 'niamh', 'caoimhe', 'saoirse', 'aoife', // Irish
  'bjorn', 'sven', 'lars', 'astrid', 'ingrid', // Scandinavian
  'singh', 'kaur', 'patel', 'khan', 'gupta', // South Asian in English contexts
  'nguyen', 'tran', 'pham', 'hoang', 'dang', // Vietnamese
  'zhang', 'wang', 'chen', 'liu', 'yang', // Chinese (romanized)
  'kim', 'park', 'choi', 'jung', 'kang', // Korean (romanized)
  'takeshi', 'yuki', 'sakura', 'hiroshi', 'kenji', // Japanese (romanized)
];

// Deduplicate
const uniqueNames = [...new Set(ENGLISH_NAMES)];

console.log(`Building models from ${uniqueNames.length} unique names...`);

// Build Markov model (trigram)
const markov = MarkovModel.train(uniqueNames, 3);
const markovBin = markov.serialize();
writeFileSync(resolve(modelsDir, 'markov.bin'), markovBin);
console.log(
  `Markov model: ${markov.size} trigrams, ${markovBin.length} bytes`,
);

// Build bloom filter for name list
const bloom = BloomFilter.fromItems(uniqueNames, 0.001);
const bloomBin = bloom.serialize();
writeFileSync(resolve(modelsDir, 'names.bloom'), bloomBin);
console.log(
  `Bloom filter: ${bloom.getItemCount()} names, ${bloomBin.length} bytes, ` +
    `estimated FPR: ${(bloom.estimatedFalsePositiveRate() * 100).toFixed(4)}%`,
);

console.log('Models written to packages/locale-en/models/');
