from pathlib import Path, PurePath
import json


def get_creds():
    p = Path.home().joinpath('custom_code/accounts.json')
    fp = open(p)
    res = json.load(fp)
    return res
