"""
BalladeBaderne Group Configuration
"""

group_info = {
    "name": "BalladeBaderne",
    "gitLinks": ["https://github.com/Balladebaderne/cookbook"],

    "backend": "http://172.189.59.40/api",
    "frontend": "http://172.189.59.40",
    "documentation": "http://172.189.59.40/apidocs/",

    "stack": ["Node.js", "Express", "React", "SQLite", "Docker", "Nginx", "Azure VM"],

    "members": [
        "Magnus Giemsa",
        "Laurits Munk",
        "Elias Garcia",
        "Andreas Brandenborg",
        "Jacob Bisgaard"
    ]
}

if __name__ == "__main__":
    print(f"Group: {group_info['name']}")
    print(f"Repository: {group_info['gitLinks']}")
    print(f"Backend: {group_info['backend']}")
    print(f"Frontend: {group_info['frontend']}")
    print(f"Documentation: {group_info['documentation']}")
    print(f"Stack: {group_info['stack']}")
    print(f"Members: {group_info['members']}")