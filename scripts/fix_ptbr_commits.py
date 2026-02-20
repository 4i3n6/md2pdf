# filter-repo commit callback: translate remaining 3 PT-BR commit subjects to EN-US.
# These commits were not covered by the initial translation pass.
# Matched by original SHA (stable across filter-repo rewrites).

HASH_MAP = {
    b"de08264a8082532e9d56955c93f8d74e827202f2": b"fix(styles): force monospace font and margins in print stylesheet",
    b"0dcb66be04b79c5559ae4a54bb5d23151656fa64": b"fix(styles): use monospace font and reduce print margins to 10-12mm",
    b"7695fd5b209edf6cd0fa73aec995f6160b2c0737": b"fix(styles): compact print spacing for better A4 page utilization",
}

original_id = commit.original_id
if original_id in HASH_MAP:
    new_subject = HASH_MAP[original_id]
    rest = commit.message.split(b"\n", 1)
    suffix = (b"\n" + rest[1]) if len(rest) > 1 else b""
    commit.message = new_subject + suffix
