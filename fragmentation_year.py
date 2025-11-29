from collections import Counter

file_path = "webapp/title.basics.tsv"
node0_rows = 20000  

years = []
rows_added = 0

with open(file_path, 'r', encoding='utf-8') as f:
    for line in f:
        if rows_added >= node0_rows:
            break
        
        parts = line.strip().split('\t')
        if len(parts) < 6:
            continue  
        rows_added += 1  
        start_year = parts[5]  
        if start_year != '\\N':
            try:
                years.append(int(start_year))
            except ValueError:
                continue

# count and print frequency of valid years
year_counts = Counter(years)
print("Year : Count")
for year, count in sorted(year_counts.items()):
    print(f"{year} : {count}")

# copute median from valid years
sorted_years = sorted(year_counts.items())
total_valid_rows = sum(year_counts.values())
cumulative = 0
median_year = None

for year, count in sorted_years:
    cumulative += count
    if cumulative >= total_valid_rows / 2:
        median_year = year
        break

print(f"\nFRAGMENT_YEAR = {median_year}")
print(f"Total Node0 rows considered: {rows_added}")
print(f"Total valid startYear rows: {total_valid_rows}")
