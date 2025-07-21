





def sanitize_input(input_str: str):
    '''
    Only keep alphanumeric characters, spaces, and preserve '@.#_-'
    '''

    s_str = input_str.replace("'", "''")

    s_str = "".join(
        char for char in s_str if char.isalnum() or char.isspace() or char in "@.#_-"
    )

    return s_str


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.1f} MB"
    else:
        return f"{size_bytes / (1024 ** 3):.1f} GB"