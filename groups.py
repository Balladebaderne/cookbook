"""
BalladeBaderne Group Configuration
Team: BalladeBaderne
Cookbook Repository
"""

group_info = {
    "name": "BalladeBaderne",
    "repository": "https://github.com/cookbookio/awesome_recipe_cookbook",
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
        "backend": ["Node.js", "Express.js"],
        "frontend": ["React"],
        "database": ["SQLite3"],
        "containerization": ["Docker", "Docker Compose"],
        "version_control": ["Git", "GitHub"],
        "documentation": ["OpenAPI/Swagger"]
    },
    "project_description": "A full-stack web application for sharing and managing recipes",
    "license": "MIT",
    "organization": "cookbookio"
}

if __name__ == "__main__":
    print(f"Group: {group_info['name']}")
    print(f"Repository: {group_info['repository']}")
    print(f"Members: {len(group_info['members'])}")
    print(f"Tech Stack: {group_info['tech_stack']}")
