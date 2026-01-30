# Potential Deal Duplicates

Generated from **Carolinas + East GA** and **Gulf Coast** Site Tracking CSVs.
Review and tell us which pairs to deduplicate and merge.

---

## Merge rules (automated script)

- **Section 1:** Everything can be merged. Keeper = non-rejected preferred; if all rejected, pick the row with more data (City, State, Stage, longer name).
- **Section 2:** Everything can be merged. Keeper = more data; if one is rejected and another is under contract (or any non-rejected stage), keep the non-rejected one.
- **Section 3:** Merge only when there is an **exact city name** and **exact state name** match **and** similar name; otherwise leave as-is.

**Run merge (dry run first):**

```bash
cd api
MERGE_DRY_RUN=1 npm run db:merge-duplicate-deals   # preview only
npm run db:merge-duplicate-deals                   # apply merges
```

Requires `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` (e.g. in `.env`).

---

## 1. Exact duplicate Site names (same text, multiple rows)

### "The Belvedere at Canopy"

- **Gulf Coast** | Rejected | Tallahassee, FL (row 59)
- **Gulf Coast** | Rejected | Tallahassee, FL (row 131)

### "Tapestry Park"

- **Gulf Coast** | Rejected | Parker, FL (row 289)
- **Gulf Coast** | Rejected | Panama City Beach, FL (row 328)

### "Orange Beach"

- **Gulf Coast** | Rejected | Orange Beach, AL (row 293)
- **Gulf Coast** | Rejected | Orange Beach, AL (row 324)

### "Lakeshore Village"

- **Gulf Coast** | Rejected | Slidell, LA (row 296)
- **Gulf Coast** | Rejected | Slidell, LA (row 429)

### "Daphne"

- **Gulf Coast** | Rejected | Daphne, AL (row 320)
- **Gulf Coast** | Rejected | Daphne, AL (row 390)

### "Winchester Rd"

- **Gulf Coast** | Rejected | Germantown, TN (row 360)
- **Gulf Coast** | Rejected | Memphis, TN (row 396)

### "Gulf Breeze"

- **Gulf Coast** | Rejected | Gulf Breeze, FL (row 373)
- **Gulf Coast** | Rejected | Gulf Breeze, FL (row 416)

### "Americana"

- **Gulf Coast** | Rejected | Baton Rouge, LA (row 408)
- **Gulf Coast** | Rejected | Zachary, LA (row 427)

## 2. Likely same deal (normalized or containing name)

- **8740 Research Park Dr** (Carolinas, Under Review, Charlotte, NC)
  ↔ **Research Park** (Gulf Coast, Rejected, Charlotte, NC)  
  _One name contains the other_


_

- **15 Carolina Point Pkwy, Greenville, SC 29607** (Carolinas, Identified, Greenville, SC)
  ↔ **Carolina Point Pkwy** (Gulf Coast, Rejected, Greenville, SC)  
  _One name contains the other_

- **Monticello Commons Drive** (Carolinas, Rejected, Weaverville, NC)
  ↔ **Monticello Commons** (Gulf Coast, Rejected, Weaverville, )  
  _One name contains the other_




- **Wildlight** (Gulf Coast, Identified, Yulee, FL)
  ↔ **Wildlight Garden District** (Gulf Coast, Rejected, Yulee, FL)  
  _One name contains the other_




- **The Waters at Sweetbay** (Gulf Coast, Under Contract, Panama City, FL)
  ↔ **Sweetbay** (Gulf Coast, Rejected, Panama City, FL)  
  _One name contains the other_




- **The Belvedere at Canopy** (Gulf Coast, Rejected, Tallahassee, FL)
  ↔ **The Canopy** (Gulf Coast, Rejected, Tallahassee, FL)  
  _One name contains the other_

- **Tapestry Park Apartments** (Gulf Coast, Rejected, Panama City Beach, FL)
  ↔ **Tapestry Park** (Gulf Coast, Rejected, Parker, FL)  
  _One name contains the other_

- **Burbank** (Gulf Coast, Rejected, Baton Rouge, LA)
  ↔ **Burbank - Southland Trace** (Gulf Coast, Rejected, Baton Rouge, LA)  
  _One name contains the other_

- **Walnut Grove** (Gulf Coast, Rejected, Memphis, TN)
  ↔ **Walnut Grove Road** (Gulf Coast, Rejected, Shelby, TN)  
  _One name contains the other_

- **Kore Mobile Midtown** (Gulf Coast, Rejected, Mobile, AL)
  ↔ **Mobile** (Gulf Coast, Rejected, Mobile, AL)  
  _One name contains the other_

- **Premier Center** (Gulf Coast, Rejected, High Point, NC)
  ↔ **Evolve Companies - Premier Center** (Gulf Coast, Rejected, High Point, NC)  
  _One name contains the other_




- **Lakeshore Villages** (Gulf Coast, Rejected, Slidell, LA)
  ↔ **Lakeshore Village** (Gulf Coast, Rejected, Slidell, LA)  
  _One name contains the other_

- **Entrada St Augustine** (Gulf Coast, Rejected, St John, FL)
  ↔ **St. Augustine** (Gulf Coast, Rejected, St. Augustine, FL)  
  _One name contains the other_

- **Huntsville #2** (Gulf Coast, Rejected, Huntsville, AL)
  ↔ **Huntsville** (Gulf Coast, Rejected, Huntsville, AL)  
  _One name contains the other_

- **Orange Beach** (Gulf Coast, Rejected, Orange Beach, AL)
  ↔ **Orange Beach - Roscoe Rd** (Gulf Coast, Rejected, Orange Beach, AL)  
  _One name contains the other_


- **Foley Beach Express #2** (Gulf Coast, Rejected, Orange Beach, AL)
  ↔ **Foley Beach Express** (Gulf Coast, Rejected, Foley, AL)  
  _One name contains the other_

- **Gulf Shores A** (Gulf Coast, Rejected, Gulf Shores, AL)
  ↔ **Gulf Shores** (Gulf Coast, Rejected, Gulf Shores, AL)  
  _One name contains the other_

- **Gulf Shores B** (Gulf Coast, Rejected, Gulf Shores, AL)
  ↔ **Gulf Shores** (Gulf Coast, Rejected, Gulf Shores, AL)  
  _One name contains the other_

- **East Bay Mobile** (Gulf Coast, Rejected, N/A, AL)
  ↔ **Mobile** (Gulf Coast, Rejected, Mobile, AL)  
  _One name contains the other_



- **Magnolia Walk East - Phase I** (Gulf Coast, Rejected, Foley, AL)
  ↔ **Magnolia Walk East - Phase II** (Gulf Coast, Rejected, Foley, AL)  
  _One name contains the other_

- **Huntsville** (Gulf Coast, Rejected, Huntsville, AL)
  ↔ **Huntsville Hwy 72** (Gulf Coast, Rejected, , AL)  
  _One name contains the other_

## 3. Same city/state, similar name (possible duplicate)

- **239 W Mallard Creek Church Rd, Charlotte, NC 28262** (Carolinas, LOI) ↔ **W Mallard Creek Rd** (Gulf Coast, Rejected) — Charlotte, NC

- **8740 Research Park Dr** (Carolinas, Under Review) ↔ **Research Park** (Gulf Coast, Rejected) — Charlotte, NC

- **Pooler Town Center** (Carolinas, Identified) ↔ **Pooler Towne Center** (Gulf Coast, Rejected) — Pooler, GA

- **15 Carolina Point Pkwy, Greenville, SC 29607** (Carolinas, Identified) ↔ **Carolina Point - TD Bank** (Gulf Coast, Rejected) — Greenville, SC

- **15 Carolina Point Pkwy, Greenville, SC 29607** (Carolinas, Identified) ↔ **Carolina Point Pkwy** (Gulf Coast, Rejected) — Greenville, SC

- **Clara Ave 392A** (Gulf Coast, Identified) ↔ **Clara Ave / 293A** (Gulf Coast, Rejected) — Panama City Beach, FL

- **Canal Road - Will Mills** (Gulf Coast, Identified) ↔ **Canal Road - Dane Haywood** (Gulf Coast, Identified) — Orange Beach, AL

- **Waters at Freeport Phase II** (Gulf Coast, Identified) ↔ **The Waters at Freeport** (Gulf Coast, CLOSED) — Freeport, FL

- **Tapestry Park Apartments** (Gulf Coast, Rejected) ↔ **Tapestry Park** (Gulf Coast, Rejected) — Panama City Beach, FL

- **Steele Creek Limited Partnership** (Gulf Coast, Rejected) ↔ **Robert Waddell - 13224 Steele Creek Rd** (Gulf Coast, Rejected) — Charlotte, NC

- **Dr. Sobel #1 Carolina Beach Rd** (Gulf Coast, Rejected) ↔ **Dr. Sobel #2 Carolina Beach Rd** (Gulf Coast, Rejected) — Silver Lake, NC

- **Funston Brunswick Village** (Gulf Coast, Rejected) ↔ **Cameron Brunswick Village** (Gulf Coast, Rejected) — Leland, NC

- **Carolina Point - TD Bank** (Gulf Coast, Rejected) ↔ **Carolina Point Pkwy** (Gulf Coast, Rejected) — Greenville, SC

- **Premier Center** (Gulf Coast, Rejected) ↔ **Evolve Companies - Premier Center** (Gulf Coast, Rejected) — High Point, NC

- **Grand River Development** (Gulf Coast, Rejected) ↔ **Grand River Parkway** (Gulf Coast, Rejected) — Leeds, AL

- **Little Rock Bancorp** (Gulf Coast, Rejected) ↔ **Little Rock Gateway** (Gulf Coast, Rejected) — Little Rock, AR

- **Oxford Way** (Gulf Coast, Rejected) ↔ **Oxford Belk Way** (Gulf Coast, Rejected) — Oxford, MS

- **Orange Beach** (Gulf Coast, Rejected) ↔ **Orange Beach - Roscoe Rd** (Gulf Coast, Rejected) — Orange Beach, AL

- **Peach Blossom #1** (Gulf Coast, Rejected) ↔ **Peach Blossom #2** (Gulf Coast, Rejected) — Warner Robins, GA

- **Gulf Shores A** (Gulf Coast, Rejected) ↔ **Gulf Shores B** (Gulf Coast, Rejected) — Gulf Shores, AL

- **Gulf Shores A** (Gulf Coast, Rejected) ↔ **Gulf Shores** (Gulf Coast, Rejected) — Gulf Shores, AL

- **Gulf Shores B** (Gulf Coast, Rejected) ↔ **Gulf Shores** (Gulf Coast, Rejected) — Gulf Shores, AL

- **Orange Beach** (Gulf Coast, Rejected) ↔ **Orange Beach - Roscoe Rd** (Gulf Coast, Rejected) — Orange Beach, AL

- **Magnolia Walk East - Phase I** (Gulf Coast, Rejected) ↔ **Magnolia Walk East - Phase II** (Gulf Coast, Rejected) — Foley, AL
