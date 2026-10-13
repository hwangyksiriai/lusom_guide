"""Build the brand-safe review copy from the published Lusom creator guide.

The output keeps the original markup, styles and image assets. Run this again
after a source update, then inspect the generated page before sharing it.
"""

from pathlib import Path
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "guide-10.html"
target = ROOT / "brand-review-10.html"
soup = BeautifulSoup(source.read_text(encoding="utf-8"), "html.parser")

for meta in soup.select('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]'):
    meta["content"] = "루솜 레드 PDRN 플럼핑 하이드로겔 마스크 — 브랜드 검토용 가이드 초안"

title = soup.find("title")
if title:
    title.string = "루솜 브랜드 검토용 가이드"

eyebrow = soup.select_one(".header-eyebrow")
if eyebrow:
    eyebrow.string = "Brand Review Draft"
subtitle = soup.select_one(".header-sub")
if subtitle:
    subtitle.string = "Lusom × SIRIAI · 브랜드 검토용"

# Schedule, payment, application, and settlement belong only in the creator copy.
for row in soup.select(".info-row"):
    key = row.select_one(".info-key")
    if key and key.get_text(" ", strip=True) in {"업로드", "업로드 유지"}:
        row.decompose()
info_title = soup.select_one(".info-box-title")
if info_title:
    info_title.string = "Campaign Details"
for warning in soup.select(".warning-box"):
    if "업로드 기한" in warning.get_text(" ", strip=True):
        warning.decompose()
for section in soup.select(".section"):
    label = section.select_one(".section-label")
    if label and label.get_text(" ", strip=True) == "Settlement":
        section.decompose()

footer = soup.select_one(".footer")
if footer:
    footer.clear()
    strong = soup.new_tag("strong")
    strong.string = "Lusom (루솜)"
    footer.append(strong)
    footer.append(soup.new_tag("br"))
    footer.append("브랜드 검토용 초안입니다. 수정할 문구나 사진을 선택해 제안해 주세요.")

# Explicit stable targets keep reviews tied to the same element in the guide.
classes = {
    "about-lead", "about-item-title", "about-item-desc", "info-val",
    "product-name", "key-msg-title", "key-msg-text", "warning-box",
    "concept-intro", "concept-body", "rec-item", "hashtag", "ref-note",
    "concept-quotes", "key-msg-item", "sub-list", "must-item", "rec-title",
}
index = 0
for element in soup.select(".section *"):
    if element.name == "img" or (classes.intersection(element.get("class", [])) and element.get_text(" ", strip=True)):
        index += 1
        element["data-siriai-review-id"] = f"lusom-10-{index:03d}"

assert index >= 40, f"Too few review targets: {index}"
assert soup.select_one('.section-label:-soup-contains("Settlement")') is None
script = soup.new_tag("script", defer="", src="/review-widget.js?v=3")
script["data-siriai-api"] = "https://siriai-workflow-plan.hwangyksiriai.chatgpt.site/api/external-reviews"
soup.body.append(script)
html = str(soup)
for forbidden in ("신분증", "통장 사본", "고료 지급", "업로드 기한", "hwangyksiriai@gmail.com"):
    assert forbidden not in html, f"Brand copy still contains: {forbidden}"
target.write_text(html, encoding="utf-8")
print(f"Created {target.name} with {index} review targets")
