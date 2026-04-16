# Training Corpora

This directory holds raw training data for building pakhad locale models. The actual corpus files (`.txt`, `.csv`) are gitignored since they can be large and may have licensing restrictions.

## Sourcing Corpora

### English Names

- **US Census Bureau**: [Frequently Occurring Surnames](https://www.census.gov/topics/population/genealogy/data/2010_surnames.html) — public domain, ~162,000 surnames
- **US SSA Baby Names**: [Baby Names from Social Security](https://www.ssa.gov/oact/babynames/names.zip) — public domain, names by year since 1880
- **UK ONS**: [Baby names in England and Wales](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesenglandandwales) — Open Government License

### Indian Names

- **Wikipedia**: Person article titles from Indian-language Wikipedias
- **Indic NLP**: [AI4Bharat IndicNLP](https://indicnlp.ai4bharat.org/) — open corpora
- **Electoral rolls**: State election commission public voter lists

## Preprocessing

Before training, all corpora should be:

1. Deduplicated
2. Lowercased
3. Stripped of whitespace
4. Filtered to remove non-name entries
5. One name per line in the output file

Example preprocessing:

```bash
cat raw-names.txt | tr '[:upper:]' '[:lower:]' | sort -u | grep -E '^[a-z]{2,}$' > cleaned-names.txt
```

## Building Models

```bash
# From the monorepo root
npx tsx packages/locale-en/src/build-models.ts
```

Or using the `@pakhad/train` programmatic API (see docs/locale-guide.md).
