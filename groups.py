"""
BalladeBaderne Group Configuration
"""

group_info = {
    "name": "BalladeBaderne",
    "gitLinks": ["https://github.com/Balladebaderne/cookbook"],
    "backend": "SQL",
    "frontend": "React",
    "monitoring": "",
    "stack": ["Node.js", "React"],
    "documentation": ["https://github.com/Balladebaderne/cookbook/blob/master/README.md"],
    "members": ["Magnus Giemsa", "Laurits Munk", "Elias Garcia", "Andreas Brandenborg", "Jacob Bisgård"]
}

if __name__ == "__main__":
    print(f"Group: {group_info['name']}")
    print(f"Repository: {group_info['gitLinks']}")
    print(f"Members: {group_info['members']}")


