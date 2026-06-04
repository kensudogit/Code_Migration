from app.services.source_chunking import merge_converted_chunks, split_source_lines


def test_split_no_limit_when_under_threshold():
    code = "line1\nline2\n"
    assert split_source_lines(code, 0) == [code]
    assert split_source_lines(code, 1000) == [code]


def test_split_on_line_boundaries():
    lines = ["x" * 50 + "\n" for _ in range(10)]
    code = "".join(lines)
    chunks = split_source_lines(code, 120)
    assert len(chunks) > 1
    assert "".join(chunks) == code


def test_merge_parts():
    merged = merge_converted_chunks(["a = 1", "a = 2"], "python")
    assert "continued" in merged
    assert "a = 1" in merged and "a = 2" in merged
