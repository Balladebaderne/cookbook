"""
BalladeBaderne Group Configuration
Team: BalladeBaderne
Cookbook Repository
"""

group_info = {
    "name": "BalladeBaderne",
    "repository": "https://github.com/Balladebaderne/cookbook",
    "git_links": [
        "https://github.com/Balladebaderne/cookbook"
    ],
    "members": [
        {
            "name": "Magnus Giemsa",
            "role": "Team Lead",
            "github": "magnus-giemsa"
        },
        {
            "name": "Laurits Munk",
            "role": "Backend Developer",
            "github": "laurits-munk"
        },
        {
            "name": "Elias Garcia",
            "role": "Frontend Developer",
            "github": "elias-garcia"
        },
        {
            "name": "Andreas Brandenborg",
            "role": "DevOps/Infrastructure",
            "github": "andreas-brandenborg"
        },
        {
            "name": "Jacob Bisgård",
            "role": "Backend Developer",
            "github": "jacob-bisgaard"
        }
    ],
    "tech_stack": {
        "backend": "SQL",
        "frontend": "React",
        "stack": ["Node.js", "React"],
        "database": ["SQLite3"],
        "containerization": ["Docker", "Docker Compose"],
        "version_control": ["Git", "GitHub"],
        "documentation": ["OpenAPI/Swagger", "https://github.com/Balladebaderne/cookbook/blob/master/README.md"]
    },
    "monitoring": "",
    "project_description": "A full-stack web application for sharing and managing recipes",
    "license": "MIT",
    "organization": "Balladebaderne"
}

if __name__ == "__main__":
    print(f"Group: {group_info['name']}")
    print(f"Repository: {group_info['repository']}")
    print(f"Members: {len(group_info['members'])}")
    print(f"Tech Stack: {group_info['tech_stack']}")
    for member in group_info['members']:
        print(f"  - {member['name']} ({member['role']})")

