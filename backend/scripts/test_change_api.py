import urllib.request
import json
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

url = 'http://127.0.0.1:8000/api/change-detection?village_id=gosaba&from_year=2020&to_year=2025'
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))

print('=== STATUS ===')
print('HTTP', req.status)
print('Data Source:', data.get('dataSource'))
print('Is Real Data:', data.get('isRealData'))

print('\n=== METRICS ===')
for m in data.get('metrics', []):
    print(f"- {m['category']}: {m['areaHa']} ha ({m['trend']})")

print('\n=== ALERTS ===')
for a in data.get('alerts', []):
    print(f"- [{a['severity'].upper()}] {a['title']} ({a.get('affectedAreaHa')} ha)")
    print(f"  {a['description']}")

print('\n=== TRANSITION NUMBERS ===')
mg = data.get('mangroveSummary', {})
print(f"2020 Baseline: {mg.get('baselineMangroveHa')} ha")
print(f"2025 Observed: {mg.get('comparisonMangroveHa')} ha")
print(f"Gross Gain: {mg.get('grossGainHa')} ha")
print(f"Gross Loss: {mg.get('grossLossHa')} ha")
print(f"Net Change: {mg.get('netChangeHa')} ha")
print(f"Mangrove -> Water: {mg.get('lossBreakdown', {}).get('toWaterHa')} ha")
print(f"Mangrove -> Aquaculture: {mg.get('lossBreakdown', {}).get('toAquacultureHa')} ha")
print(f"Water -> Mangrove: {mg.get('gainBreakdown', {}).get('fromWaterHa')} ha")
print(f"Aquaculture -> Mangrove: {mg.get('gainBreakdown', {}).get('fromAquacultureHa')} ha")
print(f"Bare Land -> Mangrove: {mg.get('gainBreakdown', {}).get('fromBareLandHa')} ha")
print(f"Confidence Score: {data.get('confidenceScore')}%")
