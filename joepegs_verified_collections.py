"""
Quick and dirty script to pull verified collections from joepegs.
"""

import json
import time

import requests


# pageSize=20&pageNum=1&orderBy=volume&filterBy=7d'
COLLECTIONS_URL = 'https://barn.joepegs.com/v2/collections'


def _filtered_collections_page(page_num, fields=(), filters=None):
    if filters is None:
        filters = {}
    response = requests.get(
        COLLECTIONS_URL,
        params={'pageSize': 100, 'pageNum': page_num}
    )
    response.raise_for_status()
    return [
        {field: collection[field] for field in fields}
        for collection in response.json()
        if all(
            collection[filter_] in value
            for filter_, value in filters.items()
        )
    ]


def joepegs_collections(fields=('address', 'name')):
    """
    Pull verified collections from joepegs.
    """
    filters = {
        'verified': {'verified', 'verified_trusted'},
        'type': {'erc721'},
    }
    page_num = 1
    collections = _filtered_collections_page(page_num, fields, filters)
    while True:
        time.sleep(5)  # be a nice person
        page_num += 1
        next_collections = _filtered_collections_page(page_num, fields, filters)  # noqa
        if not next_collections:
            break
        collections += next_collections

    return collections


if __name__ == "__main__":
    collections = joepegs_collections()
    print(json.dumps(collections, indent=4))
