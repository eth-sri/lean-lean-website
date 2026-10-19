# LeanLean website

The website of the LeanLean benchmark: <https://leanleanbench.com/>

It shows the leaderboard and, for every model and repository, what the agent changed:
a dependency graph, a code diff, and the agent's full trace.

## Run it locally

```bash
python3 serve.py 8000
```

Then open <http://localhost:8000>. The site is plain HTML, CSS and JavaScript in `site/`,
with its data already built in `site/data/`.

## Paper page

`site/paper.html` is a static abstract and citation page next to `site/paper.pdf`.
It loads no JavaScript, benchmark data, or external assets. Update the title, authors,
year, abstract, and citation URL in `pipeline/paper.json`, then run:

```bash
python3 pipeline/build_paper.py
python3 pipeline/stamp_assets.py
```

This also updates the paper metadata used by the benchmark. The full build runs
both steps, and CI checks that the generated files are current.

## Social preview

Every Pages deployment regenerates `site/assets/og.png` from the current frontier
chart, including the published reasoning variants. It also updates the image alt
text and versions the image URL so new previews can fetch the latest card.
To regenerate locally:

```bash
uv run --with playwright==1.63.0 playwright install firefox
uv run --with playwright==1.63.0 python pipeline/build_og.py
```

## Public data

Before publishing refreshed data, run `python3 pipeline/anonymize_paths.py` to
replace usernames in local home-directory paths with `user`. It updates compressed
trace packs and their byte-range indexes together. Run it with `--check` to verify
that no further replacements are needed.

## License

- **Code** (the website): MIT License, see `LICENSE`.
- **Data** (`site/data/`: results, leaderboard and agent traces):
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), except the third-party
  content below.
- **Benchmark repositories:** their code shown on the site, and the agents' edits to it,
  keep their own licenses; see each upstream repository, linked from the site.
- **System prompts:** the harnesses' built-in system prompts
  (`site/data/system-prompts.json`) belong to their makers and are reproduced for research.
- **Logos:** trademarks of their owners; see `site/assets/logos/README.md`.
