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

## Paper metadata

The homepage's Paper button links to the SRI publication page via `paper_url` in
`pipeline/paper.json`. Update the title, authors, year, paper link, and citation URL
there, then run:

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

To add or refresh a model, register it in `pipeline/sync_models.json` and run:

```bash
# Validate the selected run, archive, prompt and all 64 repository endpoints.
uv run --no-project --with PyYAML==6.0.3 --with matplotlib --with numpy \
  python pipeline/sync_results.py --models gemini-4-argon --dry-run

# Export results, traces, and registered graph/diff pairs.
uv run --no-project --with PyYAML==6.0.3 --with matplotlib --with numpy \
  python pipeline/sync_results.py --models gemini-4-argon
```

With the local website environment, use `.venv/bin/python pipeline/sync_results.py`.
Omit `--models` to sync every registered model. `--check` exits 1 when an update is
needed, `--force` rebuilds unchanged exports, and `--workers` controls parallelism.
Refreshes skip unchanged trace exports and leave identical public files untouched.
Models with a `graphs` path in the manifest also export their cached dependency
graphs, code diffs and reconciled compression breakdowns. The exporter reuses the
published baseline layout, checks every source against the scored endpoint, and
uses cached macro measurements without running Lean. Graph exports are staged
until every requested passing pair validates. Use `--skip-graphs` for a results
and traces refresh, or run `python pipeline/sync_graphs.py` separately. Its `--check`,
`--models`, `--workers` and input-root flags work like the main sync; `--only` can
limit a diagnostic export to one repository.
Install the `zstd` command to read large JSON artifacts compressed by the results
packer, including heartbeat measurements. Missing heartbeat values mean that the
separate measurement stage has not completed for that passing submission; failed
submissions are ineligible. They do not affect the Lean-token compression score.
The analysis view shows heartbeats only when a measurement exists.
Every sync also refreshes available heartbeat measurements for published models
whose archived result hashes still match the website, including compressed files.

The defaults read unpacked runs from `~/lean-lean` and packed results from
`~/lean-lean-results/results`. Override these with `--leanlean-root` and
`--archive-root` (or `LEANLEAN_ROOT` and `LEANLEAN_RESULTS_ROOT`, the latter naming
the archive directory containing `results/`). The unpacked checkout supplies the
run configuration, captured native prompt and `scripts/analysis/plot_action_classes.py`.
Each manifest entry names its exact run and archive pair; the sync never searches
for a newer run or mixes in Mini/retry datasets. It needs completed endpoint
postprocessing and unpacked playback logs, diffs and source snapshots. It recounts
each checkpoint with the checkout's Lean-token metric and verifies the recorded
endpoints; it does not run Lean or unpack
the entire results archive.

Raw runs and archives remain outside this repository. The lock, input/output
checksums and temporary staging live in gitignored `hidden/data/sync/`. Generated
`site/data/` remains tracked for the existing Pages deployment. Inputs must cover
the benchmark's repositories, match its baseline tokens, task prompt and limits,
and agree between the packed and unpacked result files. The sync stages all trace
exports and checks the gzip pack indexes before publishing; validation/export
failures leave the public files untouched. Source result, configuration and native
prompt hashes are recorded in `benchmark.json`. Other models retain their data.

Add future model entries with a unique `key` and `short`, display metadata,
`source` relative to the archive's `results/`, `run` relative to the LeanLean
checkout, an `updated_at` release date, and a `config.harness` display name. Request
settings, pricing and native tools come from that run. The trace adapters support
the benchmark's existing harnesses. Set `graphs` to a completed analysis directory
relative to the checkout, containing `classification-inputs.csv`, the compression
classification CSV, source archives, graphs and cached macro measurements. The
checkout supplies its classifier and source-accounting exporter. The sync exports
these existing graph artifacts; it does not extract new graphs or measure heartbeats.

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
