/**
 * Benchmark test data — real names and gibberish strings for precision/recall testing.
 */

// Real names that should be classified as "clean"
export const REAL_NAMES: string[] = [
  // Common English names
  'John Smith', 'Sarah Johnson', 'Michael Williams', 'Jessica Brown',
  'Robert Davis', 'Jennifer Wilson', 'William Moore', 'Elizabeth Taylor',
  'David Anderson', 'Margaret Thomas', 'James Jackson', 'Patricia White',
  'Christopher Harris', 'Linda Martin', 'Daniel Thompson', 'Barbara Garcia',
  'Matthew Martinez', 'Susan Robinson', 'Anthony Clark', 'Dorothy Lewis',
  'Mark Lee', 'Nancy Walker', 'Donald Hall', 'Karen Allen', 'Steven Young',
  'Betty King', 'Paul Wright', 'Helen Lopez', 'Andrew Hill', 'Sandra Scott',

  // Indian names (romanized)
  'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Gupta',
  'Rajesh Singh', 'Anita Verma', 'Nikhil Joshi', 'Kavita Reddy',
  'Suresh Nair', 'Deepika Desai', 'Vikram Chauhan', 'Pooja Mehta',
  'Sanjay Yadav', 'Meena Iyer', 'Arun Pillai', 'Lakshmi Naidu',
  'Ganesh Patil', 'Sunita Banerjee', 'Manoj Tiwari', 'Aarti Kulkarni',

  // Irish/Celtic names (common false positives)
  'Siobhan Murphy', 'Niamh Kelly', 'Caoimhe Ryan', 'Saoirse Byrne',
  'Aoife Doyle',

  // Scandinavian names
  'Bjorn Eriksson', 'Sven Lindberg', 'Astrid Johansson', 'Lars Nilsson',
  'Ingrid Andersson',

  // East Asian romanized names
  'Wei Zhang', 'Jin Wang', 'Min Chen', 'Yuki Tanaka', 'Hiroshi Yamamoto',
  'Hye Kim', 'Ji Park', 'Tuan Nguyen', 'Mai Tran', 'Duc Pham',

  // Single names
  'Rahul', 'Sarah', 'Michael', 'Priya', 'David', 'Lakshmi', 'William',
  'Kavita', 'James', 'Sneha', 'Robert', 'Deepika', 'John', 'Anita',

  // Names with unusual patterns (should still be clean)
  'Schwarzenegger', 'Tchaikovsky', 'Brzezinski', 'Krzyzewski',
  'Djokovic', 'Nguyen', 'Bjork',
];

// Gibberish strings that should be classified as "suspicious" or "gibberish"
export const GIBBERISH_STRINGS: string[] = [
  // Keyboard walks
  'asdfgh', 'qwerty', 'zxcvbn', 'qweasd', 'asdfghjkl',
  'asdfgh jkl', 'qwerty uiop', 'zxcvbn asdfgh',

  // Random character sequences
  'xkqzvb', 'wwwxxx', 'zqjkpl', 'bxmfnr', 'tvwqzj',
  'xkqzvb wwwxxx', 'zqjkpl bxmfnr', 'tvwqzj xkqzvb',

  // Repetitive patterns
  'aaaa', 'bbbb cccc', 'abcabc', 'xyzxyz', 'aaaaaa bbbbbb',
  'abababab', 'zzzzz', 'qqqqq wwwww',

  // All consonants
  'bcdfgh', 'mnpqrs', 'tvwxyz', 'bcdfgh klmnp',

  // Sequential numbers (in name context)
  '123456', '99999', '111111',

  // Smashed together gibberish
  'sdfjklsd', 'pqwoeiur', 'mnbvcxza', 'lkjhgfdsa',
  'poiuytrewq', 'nbvcxzas',

  // Gibberish with name-like structure
  'Xkqz Vbww', 'Asdf Ghjk', 'Zxcv Bnmq', 'Qwer Tyui',
  'Mnbv Cxzl', 'Jklh Gfds',

  // Mixed gibberish
  'aaaa xkqz', 'qwer 1234', 'abcabc xyzxyz',

  // Short gibberish
  'xx', 'zz qq', 'fff ggg',
];

// Names from other libraries' known false positive lists
export const FALSE_POSITIVE_REGRESSION: string[] = [
  // These are real names that naive gibberish detectors often flag
  'Siobhan', 'Niamh', 'Aoife', 'Saoirse', 'Caoimhe',  // Irish
  'Nguyen', 'Pham', 'Tran', 'Hoang', 'Dang',           // Vietnamese
  'Bjorn', 'Sven', 'Astrid', 'Ingrid', 'Lars',          // Scandinavian
  'Zhang', 'Wang', 'Chen', 'Liu', 'Yang',                // Chinese romanized
  'Takeshi', 'Yuki', 'Sakura', 'Hiroshi', 'Kenji',      // Japanese romanized
  'Singh', 'Kaur', 'Patel', 'Khan', 'Gupta',             // South Asian
  'Schwarzenegger', 'Tchaikovsky', 'Brzezinski',          // Long/unusual
  'Sri', 'Wu', 'Li', 'Xu', 'Hu',                         // Very short but real
];
