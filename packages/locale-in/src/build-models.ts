/**
 * Build script for locale-in models.
 *
 * Generates Latin-script (romanized) Markov models and name lists for
 * Indian languages. Each language gets its own locale with:
 * - Markov model trained on romanized names
 * - Bloom filter of known names (romanized, lowercase)
 *
 * Run with: npx tsx packages/locale-in/src/build-models.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BloomFilter, MarkovModel } from '@pakhad/train/runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = resolve(__dirname, '../models');

// Curated Indian name corpora — romanized, lowercase.
// Sourced from publicly available electoral rolls, Wikipedia person lists,
// and common name databases. Each language has first names + surnames.

const HINDI_NAMES: string[] = [
  // Male first names
  'aarav', 'aditya', 'ajay', 'akash', 'aman', 'amit', 'amrit', 'anand',
  'anil', 'ankur', 'anuj', 'arjun', 'ashish', 'ashok', 'baldev', 'bharat',
  'chandan', 'deepak', 'devendra', 'dhruv', 'dinesh', 'gaurav', 'gopal',
  'govind', 'hari', 'harsh', 'hemant', 'hitesh', 'ishaan', 'jagdish',
  'jatin', 'jayesh', 'kamal', 'kapil', 'karan', 'kartik', 'krishan',
  'krishna', 'kunal', 'lalit', 'lokesh', 'mahesh', 'manish', 'manoj',
  'mohit', 'mukesh', 'naman', 'naresh', 'naveen', 'nikhil', 'nishant',
  'om', 'pankaj', 'paras', 'pawan', 'pradeep', 'prakash', 'pranav',
  'pramod', 'prashant', 'praveen', 'prem', 'rahul', 'raj', 'rajat',
  'rajesh', 'rajiv', 'rakesh', 'ramesh', 'ravi', 'rohit', 'sachin',
  'sahil', 'sanjay', 'sandeep', 'satish', 'shivam', 'shyam', 'siddharth',
  'sonu', 'sudhir', 'sumit', 'sunil', 'suraj', 'suresh', 'tarun',
  'tushar', 'umesh', 'varun', 'vijay', 'vikram', 'vinay', 'vinod',
  'vipin', 'vishal', 'vivek', 'yash', 'yogesh',
  // Female first names
  'aanchal', 'aarti', 'aditi', 'akanksha', 'amita', 'ananya', 'anita',
  'anjali', 'ankita', 'archana', 'bhavna', 'chhaya', 'deepika', 'devi',
  'divya', 'ekta', 'garima', 'gayatri', 'geeta', 'isha', 'jaya', 'jyoti',
  'kajal', 'kalpana', 'kamala', 'kavita', 'kiran', 'komal', 'kriti',
  'lata', 'leela', 'madhu', 'mamta', 'manisha', 'maya', 'meena',
  'megha', 'mira', 'monika', 'namita', 'neelam', 'neha', 'nidhi',
  'nisha', 'nitu', 'pallavi', 'pooja', 'prachi', 'pragya', 'pratibha',
  'preeti', 'prerna', 'priya', 'priyanka', 'puja', 'rachna', 'radha',
  'ranjana', 'rashmi', 'ratna', 'raveena', 'rekha', 'renuka', 'richa',
  'rina', 'ritu', 'riya', 'ruchi', 'rupal', 'sadhana', 'sakshi',
  'sandhya', 'sangita', 'sapna', 'sarita', 'seema', 'shikha', 'shobha',
  'shreya', 'shweta', 'simran', 'sita', 'smita', 'sneha', 'sonia',
  'sunita', 'surbhi', 'swati', 'tanvi', 'tara', 'usha', 'vandana',
  'varsha', 'vidya', 'vimla',
  // Common Hindi surnames
  'agarwal', 'arora', 'bansal', 'bhatia', 'chauhan', 'chaudhary',
  'chopra', 'choudhary', 'dwivedi', 'garg', 'goel', 'goyal', 'gupta',
  'jain', 'jaiswal', 'jha', 'joshi', 'kapoor', 'kashyap', 'khan',
  'khatri', 'kohli', 'kumar', 'mahajan', 'malhotra', 'mehra', 'mishra',
  'mittal', 'nagar', 'nair', 'pandey', 'pandit', 'patel', 'pathak',
  'rajan', 'rana', 'rastogi', 'rathi', 'rawat', 'saini', 'saxena',
  'seth', 'sharma', 'shukla', 'singh', 'singhal', 'sinha', 'srivastava',
  'tandon', 'tiwari', 'trivedi', 'tyagi', 'upadhyay', 'vashishth',
  'verma', 'yadav',
];

const MARATHI_NAMES: string[] = [
  // Male first names
  'aaditya', 'abhijeet', 'abhishek', 'ajinkya', 'akshay', 'amol',
  'aniket', 'aniruddha', 'ashutosh', 'bhushan', 'chaitanya', 'chinmay',
  'datta', 'digambar', 'ganesh', 'girish', 'govind', 'harish',
  'hemant', 'jayant', 'kedar', 'kiran', 'laxman', 'madhav', 'mahendra',
  'mangesh', 'milind', 'mohan', 'nagesh', 'narayan', 'ninad', 'omkar',
  'paresh', 'prashant', 'pratik', 'pravin', 'rajendra', 'ramdas',
  'rushikesh', 'sachin', 'sagar', 'sambhaji', 'sandeep', 'sandesh',
  'santosh', 'satish', 'shailesh', 'shankar', 'shivaji', 'shripad',
  'subhash', 'sudhir', 'suhas', 'sumedh', 'sunil', 'sushil', 'tanmay',
  'tushar', 'vaibhav', 'vikas', 'vinayak', 'vishwas', 'vitthal', 'yashwant',
  // Female first names
  'anagha', 'aparna', 'ashwini', 'bharati', 'chhaya', 'deepa', 'gauri',
  'indira', 'jayashree', 'jyotsna', 'kaveri', 'ketaki', 'lata', 'madhuri',
  'mangal', 'manisha', 'meera', 'mukta', 'nanda', 'nirmala', 'padma',
  'pallavi', 'parvati', 'prachi', 'prajakta', 'pratiksha', 'revati',
  'rohini', 'rupali', 'rutuja', 'sadhana', 'savita', 'shanta',
  'sharmila', 'shubhada', 'smita', 'sonali', 'sunetra', 'sunanda',
  'suvarna', 'swati', 'ujwala', 'urmila', 'vaishali', 'vandana',
  'varsha', 'vidya', 'vinda', 'yamini', 'yogita',
  // Common Marathi surnames
  'abhyankar', 'apte', 'bhagwat', 'bhalerao', 'bhide', 'borde',
  'chavan', 'dabholkar', 'dange', 'desai', 'deshpande', 'dhage',
  'dhamale', 'gaikwad', 'ghate', 'gokhale', 'gore', 'jadhav',
  'jog', 'joshi', 'kadam', 'kale', 'kamble', 'karve', 'kelkar',
  'khandekar', 'kulkarni', 'lad', 'limaye', 'mane', 'marathe',
  'naik', 'nene', 'nimonkar', 'oak', 'palkar', 'pandit', 'parab',
  'patil', 'phadke', 'ranade', 'sathe', 'sawant', 'shintre', 'shinde',
  'shirke', 'tambe', 'thackeray', 'wagh', 'walawalkar',
];

const TAMIL_NAMES: string[] = [
  // Male first names
  'aadhavan', 'aravind', 'ashwin', 'bala', 'bharath', 'chandra',
  'dhanush', 'ganesh', 'gopal', 'hari', 'harish', 'karthik', 'kumar',
  'lakshman', 'mani', 'mohan', 'murugan', 'nandha', 'naveen', 'prabhu',
  'prakash', 'prasad', 'raja', 'rajesh', 'rajan', 'ram', 'ramesh',
  'saravanan', 'selvam', 'senthil', 'shankar', 'siva', 'srinivasan',
  'subramanian', 'suresh', 'tamilselvan', 'varun', 'vignesh', 'vijay',
  // Female first names
  'aishwarya', 'amudha', 'anitha', 'deepa', 'dhivya', 'geetha',
  'indira', 'janani', 'kala', 'kamala', 'kavitha', 'lakshmi', 'lalitha',
  'malathi', 'meena', 'muthulakshmi', 'nandini', 'padma', 'priya',
  'radha', 'rajeshwari', 'revathi', 'sarala', 'saraswathi', 'selvi',
  'shanthi', 'sridevi', 'suganya', 'sumathi', 'thenmozhi', 'uma',
  'vaani', 'vasanthi', 'vimala',
  // Common Tamil surnames
  'arumugam', 'balasubramanian', 'chettiar', 'ganapathy', 'iyer',
  'iyengar', 'krishnamurthy', 'mudaliar', 'murugesan', 'nadar',
  'naidu', 'natarajan', 'palani', 'pillai', 'rajagopal', 'ramamurthy',
  'ramasamy', 'shanmugam', 'subramani', 'sundaram', 'thevar',
  'venkatesan', 'viswanathan',
];

const TELUGU_NAMES: string[] = [
  'aditya', 'anand', 'bharath', 'chandra', 'ganesh', 'hari', 'kalyan',
  'krishna', 'mahesh', 'nagarjuna', 'naidu', 'nandini', 'naveen',
  'padma', 'pavan', 'pradeep', 'prasad', 'rajesh', 'ramesh', 'ravi',
  'reddy', 'sai', 'sandeep', 'srinivas', 'suresh', 'venkat',
  'venugopal', 'vijay', 'yadav',
  // Surnames
  'chowdary', 'goud', 'kamma', 'kapu', 'naidu', 'nayak', 'rao',
  'reddy', 'setty', 'varma',
];

const KANNADA_NAMES: string[] = [
  'anand', 'ashok', 'basavaraj', 'chandrashekhar', 'darshan', 'ganesh',
  'girish', 'harsha', 'jagadish', 'kumar', 'mahesh', 'manjunath',
  'murali', 'nagesh', 'nagaraj', 'prakash', 'prasad', 'priya', 'rajesh',
  'ramesh', 'ravi', 'shivakumar', 'siddarth', 'suresh', 'vijay',
  // Surnames
  'gowda', 'hegde', 'kamath', 'nayak', 'patil', 'shetty',
];

const MALAYALAM_NAMES: string[] = [
  'ajith', 'anoop', 'arun', 'biju', 'dileep', 'george', 'gopinath',
  'hari', 'jayakumar', 'krishnan', 'manoj', 'mohan', 'mohanlal',
  'nair', 'pillai', 'pradeep', 'rajeev', 'rajan', 'ramesh', 'sajan',
  'satheesh', 'sreekumar', 'suresh', 'thankappan', 'varghese', 'vijayan',
  // Female names
  'amala', 'asha', 'geetha', 'jayanthi', 'kavitha', 'lakshmi', 'latha',
  'meera', 'minu', 'nisha', 'priya', 'remya', 'saritha', 'shalini',
  'shobha', 'sindhu', 'suja', 'suma', 'usha',
  // Surnames
  'kurup', 'menon', 'nair', 'namboothiri', 'pillai', 'thampi', 'varma',
];

const BENGALI_NAMES: string[] = [
  'abhijit', 'amitabh', 'anirban', 'arijit', 'arnab', 'ashis', 'atanu',
  'biplab', 'biswajit', 'debashis', 'dipankar', 'gopal', 'indrajit',
  'jayanta', 'kaushik', 'mithun', 'partha', 'prasenjit', 'rajib',
  'ranajit', 'sabyasachi', 'saikat', 'samiran', 'sandip', 'shankar',
  'shubho', 'soumitra', 'subrata', 'sukumar', 'sunil', 'tapan',
  // Female names
  'aditi', 'amrita', 'ananya', 'anindita', 'aparna', 'arpita', 'bidisha',
  'debjani', 'indrani', 'jaya', 'keya', 'madhuri', 'mallika', 'mahua',
  'moumita', 'nandini', 'payel', 'puja', 'raima', 'rituparna', 'riya',
  'satabdi', 'sharmishtha', 'shruti', 'soma', 'suchitra', 'swastika',
  // Surnames
  'banerjee', 'basu', 'bhaduri', 'bhattacharya', 'bose', 'chakraborty',
  'chatterjee', 'dasgupta', 'dey', 'dutta', 'ganguly', 'ghosh',
  'guha', 'haldar', 'hazra', 'kundu', 'majumdar', 'mitra', 'mukherjee',
  'nandi', 'pal', 'roy', 'sarkar', 'sen', 'sengupta',
];

const GUJARATI_NAMES: string[] = [
  'aarav', 'bharat', 'chetan', 'darshan', 'dhaval', 'hiren', 'jatin',
  'jayesh', 'ketan', 'kishore', 'mehul', 'mitul', 'nirav', 'paresh',
  'parth', 'pranav', 'rajan', 'rajiv', 'sagar', 'tejas', 'tushar',
  'vaibhav', 'vipul', 'yash',
  // Female names
  'bhumika', 'darshana', 'falguni', 'hetal', 'isha', 'jagruti', 'kajal',
  'komal', 'krina', 'maitri', 'nidhi', 'palak', 'priti', 'riya',
  'shalini', 'shilpa', 'shruti', 'swara', 'urvi', 'vidhi',
  // Surnames
  'amin', 'bhatt', 'chauhan', 'dave', 'desai', 'doshi', 'jani',
  'joshi', 'mehta', 'modi', 'naik', 'panchal', 'pandya', 'parikh',
  'patel', 'raval', 'shah', 'sheth', 'thakkar', 'trivedi', 'vyas',
];

const PUNJABI_NAMES: string[] = [
  'amarjeet', 'amrit', 'baljeet', 'balwinder', 'charanjit', 'daljit',
  'davinder', 'gurpreet', 'gurwinder', 'harjit', 'harpreet', 'inder',
  'jagjit', 'jaspreet', 'jatinder', 'kulwinder', 'mandeep', 'manjeet',
  'navjot', 'paramjit', 'rajinder', 'ranjit', 'satinder', 'simranjeet',
  'sukhwinder', 'surjit', 'tejinder',
  // Female names
  'amanjot', 'amanpreet', 'gurleen', 'harleen', 'jasmeen', 'jasleen',
  'kirandeep', 'manpreet', 'navneet', 'parneet', 'rajveer', 'simran',
  'sukhleen', 'tanveer',
  // Surnames
  'arora', 'bajwa', 'bedi', 'bhullar', 'chopra', 'dhillon', 'gill',
  'grewal', 'johal', 'kalra', 'kaur', 'khattar', 'kohli', 'malhotra',
  'sahni', 'sandhu', 'sethi', 'sidhu', 'singh', 'sodhi', 'walia',
];

// Build models for each language
interface LanguageConfig {
  id: string;
  names: string[];
}

const languages: LanguageConfig[] = [
  { id: 'in-hi', names: HINDI_NAMES },
  { id: 'in-mr', names: MARATHI_NAMES },
  { id: 'in-ta', names: TAMIL_NAMES },
  { id: 'in-te', names: TELUGU_NAMES },
  { id: 'in-kn', names: KANNADA_NAMES },
  { id: 'in-ml', names: MALAYALAM_NAMES },
  { id: 'in-bn', names: BENGALI_NAMES },
  { id: 'in-gu', names: GUJARATI_NAMES },
  { id: 'in-pa', names: PUNJABI_NAMES },
];

// Also build a combined "all Indian names" corpus
const allIndianNames = [...new Set(languages.flatMap((l) => l.names))];

console.log(`Building models for ${languages.length} Indian languages...`);
console.log(`Total unique names across all languages: ${allIndianNames.length}`);

for (const lang of languages) {
  const unique = [...new Set(lang.names)];
  console.log(`\n${lang.id}: ${unique.length} names`);

  // Build Markov model (trigram, romanized)
  const markov = MarkovModel.train(unique, 3);
  const markovBin = markov.serialize();
  writeFileSync(resolve(modelsDir, `${lang.id}-markov.bin`), markovBin);
  console.log(`  Markov: ${markov.size} trigrams, ${markovBin.length} bytes`);

  // Build bloom filter
  const bloom = BloomFilter.fromItems(unique, 0.001);
  const bloomBin = bloom.serialize();
  writeFileSync(resolve(modelsDir, `${lang.id}-names.bloom`), bloomBin);
  console.log(`  Bloom: ${bloom.getItemCount()} names, ${bloomBin.length} bytes`);
}

// Build combined model (all Indian names together)
console.log(`\nCombined (all Indian): ${allIndianNames.length} names`);
const combinedMarkov = MarkovModel.train(allIndianNames, 3);
const combinedMarkovBin = combinedMarkov.serialize();
writeFileSync(resolve(modelsDir, 'in-all-markov.bin'), combinedMarkovBin);
console.log(`  Markov: ${combinedMarkov.size} trigrams, ${combinedMarkovBin.length} bytes`);

const combinedBloom = BloomFilter.fromItems(allIndianNames, 0.001);
const combinedBloomBin = combinedBloom.serialize();
writeFileSync(resolve(modelsDir, 'in-all-names.bloom'), combinedBloomBin);
console.log(`  Bloom: ${combinedBloom.getItemCount()} names, ${combinedBloomBin.length} bytes`);

console.log('\nAll models written to packages/locale-in/models/');
