# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify, render_template
import sqlite3
import json

app = Flask(__name__)
DATABASE = 'app.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            time_minutes INTEGER NOT NULL,
            price TEXT NOT NULL,
            link TEXT,
            description TEXT,
            image TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipe_ingredients (
            recipe_id INTEGER,
            ingredient_id INTEGER,
            amount TEXT,
            unit TEXT,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipe_tags (
            recipe_id INTEGER,
            tag_id INTEGER,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        )
    ''')

    cursor.execute('SELECT COUNT(*) FROM recipes')
    recipe_count = cursor.fetchone()[0]

    if recipe_count == 0:
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Spaghetti')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Eggs')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Pancetta')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Parmesan Cheese')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Black Pepper')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Salt')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Chicken Breast')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Breadcrumbs')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Mozzarella Cheese')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Tomato Sauce')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Olive Oil')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Garlic')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Penne Pasta')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Bell Peppers')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Zucchini')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Cherry Tomatoes')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Basil')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Butter')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Flour')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Salmon Fillet')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Lemon')")
        cursor.execute("INSERT INTO ingredients (name) VALUES ('Dill')")

        cursor.execute("INSERT INTO tags (name) VALUES ('Italian')")
        cursor.execute("INSERT INTO tags (name) VALUES ('Quick')")
        cursor.execute("INSERT INTO tags (name) VALUES ('Dinner')")
        cursor.execute("INSERT INTO tags (name) VALUES ('Vegetarian')")
        cursor.execute("INSERT INTO tags (name) VALUES ('Healthy')")
        cursor.execute("INSERT INTO tags (name) VALUES ('Seafood')")

        cursor.execute("""
            INSERT INTO recipes (title, time_minutes, price, link, description)
            VALUES ('Spaghetti Carbonara', 25, '12.50', 'http://example.com/carbonara',
            'Step 1: Bring a large pot of salted water to boil and cook 400g spaghetti according to package directions.

Step 2: While pasta cooks, cut 200g pancetta into small cubes and fry in a large pan over medium heat until crispy (about 5 minutes).

Step 3: In a bowl, whisk together 4 large eggs, 100g grated Parmesan cheese, and plenty of black pepper.

Step 4: When pasta is ready, reserve 1 cup of pasta water, then drain the pasta.

Step 5: Remove the pan with pancetta from heat. Add the hot pasta to the pan and toss.

Step 6: Pour the egg mixture over the pasta and toss quickly. The heat from the pasta will cook the eggs. Add pasta water bit by bit if needed to create a creamy sauce.

Step 7: Serve immediately with extra Parmesan cheese and black pepper.')
        """)
        recipe1_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO recipes (title, time_minutes, price, link, description)
            VALUES ('Chicken Parmesan', 50, '18.00', 'http://example.com/chicken-parm',
            'Step 1: Preheat oven to 200C (400F).

Step 2: Place 2 chicken breasts between plastic wrap and pound to 2cm thickness.

Step 3: Set up breading station: flour in one plate, 2 beaten eggs in another, and 150g breadcrumbs mixed with 50g Parmesan in a third.

Step 4: Season chicken with salt and pepper, then coat in flour, dip in egg, and press into breadcrumb mixture.

Step 5: Heat 3 tablespoons olive oil in a large oven-safe skillet over medium-high heat. Fry chicken until golden brown, about 4 minutes per side.

Step 6: Pour 300ml tomato sauce over the chicken, then top each breast with 100g sliced mozzarella.

Step 7: Transfer skillet to oven and bake for 15-20 minutes until cheese is melted and bubbly.

Step 8: Garnish with fresh basil and serve with pasta or salad.')
        """)
        recipe2_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO recipes (title, time_minutes, price, link, description)
            VALUES ('Pasta Primavera', 30, '10.00', 'http://example.com/primavera',
            'Step 1: Cook 350g penne pasta in salted boiling water according to package directions. Reserve 1 cup pasta water before draining.

Step 2: While pasta cooks, chop 1 red bell pepper, 1 zucchini into bite-sized pieces, and halve 200g cherry tomatoes.

Step 3: Heat 3 tablespoons olive oil in a large pan over medium-high heat. Add 3 minced garlic cloves and cook for 30 seconds.

Step 4: Add bell peppers and zucchini to the pan. Cook for 5-7 minutes until vegetables are tender.

Step 5: Add cherry tomatoes and cook for another 2-3 minutes until they start to soften.

Step 6: Add the drained pasta to the pan with vegetables. Toss everything together, adding pasta water as needed to create a light sauce.

Step 7: Season with salt and black pepper. Remove from heat and stir in fresh basil leaves.

Step 8: Serve hot with grated Parmesan cheese on top.')
        """)
        recipe3_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO recipes (title, time_minutes, price, link, description)
            VALUES ('Garlic Butter Salmon', 20, '22.00', 'http://example.com/salmon',
            'Step 1: Pat 4 salmon fillets (150g each) dry with paper towels and season both sides with salt and pepper.

Step 2: Heat 2 tablespoons olive oil in a large skillet over medium-high heat.

Step 3: Place salmon fillets skin-side up in the pan. Cook for 4-5 minutes until golden brown.

Step 4: Flip the salmon and cook for another 3-4 minutes.

Step 5: Reduce heat to medium and add 3 tablespoons butter, 4 minced garlic cloves, and juice of 1 lemon to the pan.

Step 6: Spoon the garlic butter sauce over the salmon repeatedly for 1-2 minutes.

Step 7: Remove from heat and sprinkle with fresh dill.

Step 8: Serve immediately with the pan sauce, accompanied by rice or vegetables.')
        """)
        recipe4_id = cursor.lastrowid

        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe1_id, 1, '400', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe1_id, 2, '4', 'large'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe1_id, 3, '200', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe1_id, 4, '100', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe1_id, 5, '1', 'tsp'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe1_id, 6, '1', 'tsp'))

        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 7, '2', 'pieces'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 8, '150', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 9, '100', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 10, '300', 'ml'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 11, '3', 'tbsp'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 4, '50', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 2, '2', 'large'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 19, '100', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe2_id, 17, '10', 'leaves'))

        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 13, '350', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 14, '1', 'piece'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 15, '1', 'piece'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 16, '200', 'g'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 12, '3', 'cloves'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 11, '3', 'tbsp'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 17, '15', 'leaves'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe3_id, 4, '50', 'g'))

        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe4_id, 20, '4', 'fillets'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe4_id, 18, '3', 'tbsp'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe4_id, 12, '4', 'cloves'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe4_id, 21, '1', 'piece'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe4_id, 22, '2', 'tbsp'))
        cursor.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)', (recipe4_id, 11, '2', 'tbsp'))

        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe1_id, 1))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe1_id, 3))

        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe2_id, 1))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe2_id, 3))

        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe3_id, 1))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe3_id, 2))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe3_id, 4))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe3_id, 5))

        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe4_id, 2))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe4_id, 3))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe4_id, 5))
        cursor.execute('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', (recipe4_id, 6))

    conn.commit()
    conn.close()

@app.route('/')
def home():
    print 'Route invoked: GET /'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, time_minutes, price, link FROM recipes')
    recipes = cursor.fetchall()

    recipes_with_tags = []
    for recipe in recipes:
        cursor.execute('''
            SELECT t.id, t.name FROM tags t
            JOIN recipe_tags rt ON t.id = rt.tag_id
            WHERE rt.recipe_id = ?
        ''', (recipe['id'],))
        recipe_tags = cursor.fetchall()

        recipes_with_tags.append({
            'id': recipe['id'],
            'title': recipe['title'],
            'time_minutes': recipe['time_minutes'],
            'price': recipe['price'],
            'link': recipe['link'] or '',
            'tags': [{'id': tag['id'], 'name': tag['name']} for tag in recipe_tags]
        })

    conn.close()
    return render_template('home.html', recipes=recipes_with_tags)

@app.route('/recipes/<int:id>/')
def recipe_detail(id):
    print 'Route invoked: GET /recipes/<int:id>/'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, time_minutes, price, link, description FROM recipes WHERE id = ' + str(id))
    recipe = cursor.fetchone()

    cursor.execute('''
        SELECT i.id, i.name, ri.amount, ri.unit FROM ingredients i
        JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = ''' + str(id))
    recipe_ingredients = cursor.fetchall()

    cursor.execute('''
        SELECT t.id, t.name FROM tags t
        JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE rt.recipe_id = ''' + str(id))
    recipe_tags = cursor.fetchall()

    conn.close()

    recipe_data = {
        'id': recipe['id'],
        'title': recipe['title'],
        'time_minutes': recipe['time_minutes'],
        'price': recipe['price'],
        'link': recipe['link'] or '',
        'description': recipe['description'] or '',
        'ingredients': [{'id': ing['id'], 'name': ing['name'], 'amount': ing['amount'], 'unit': ing['unit']} for ing in recipe_ingredients],
        'tags': [{'id': tag['id'], 'name': tag['name']} for tag in recipe_tags]
    }

    return render_template('recipe_detail.html', recipe=recipe_data)

@app.route('/api', methods=['GET'])
def api_overview():
    print 'Route invoked: GET /api'
    routes = {
        'create_user_url': 'http://localhost:3000/api/user/create/',
        'current_user_url': 'http://localhost:3000/api/user/me/',
        'user_token_url': 'http://localhost:3000/api/user/token/',
        'recipes_url': 'http://localhost:3000/api/recipe/recipes/{?ingredients,tags}',
        'recipe_url': 'http://localhost:3000/api/recipe/recipes/{id}/',
        'recipe_image_url': 'http://localhost:3000/api/recipe/recipes/{id}/upload-image/',
        'ingredients_url': 'http://localhost:3000/api/recipe/ingredients/{?assigned_only}',
        'ingredient_url': 'http://localhost:3000/api/recipe/ingredients/{id}/',
        'tags_url': 'http://localhost:3000/api/recipe/tags/{?assigned_only}',
        'tag_url': 'http://localhost:3000/api/recipe/tags/{id}/'
    }
    return jsonify(routes), 200

@app.route('/api/user/create/', methods=['POST'])
def user_create():
    print 'Route invoked: POST /api/user/create/'
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
        (email, password, name)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'email': email,
        'name': name
    }), 201

@app.route('/api/user/me/', methods=['GET'])
def user_me_retrieve():
    print 'Route invoked: GET /api/user/me/'
    return jsonify({
        'email': 'user@example.com',
        'name': 'Example User'
    }), 200

@app.route('/api/user/me/', methods=['PUT'])
def user_me_update():
    print 'Route invoked: PUT /api/user/me/'
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')

    return jsonify({
        'email': email,
        'name': name
    }), 200

@app.route('/api/user/me/', methods=['PATCH'])
def user_me_partial_update():
    print 'Route invoked: PATCH /api/user/me/'
    data = request.get_json()

    response = {}
    if data.has_key('email'):
        response['email'] = data['email']
    else:
        response['email'] = 'user@example.com'

    if data.has_key('name'):
        response['name'] = data['name']
    else:
        response['name'] = 'Example User'

    return jsonify(response), 200

@app.route('/api/user/token/', methods=['POST'])
def user_token_create():
    print 'Route invoked: POST /api/user/token/'
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    return jsonify({
        'email': email,
        'password': password
    }), 200

@app.route('/api/recipe/recipes/', methods=['GET'])
def recipe_recipes_list():
    print 'Route invoked: GET /api/recipe/recipes/'
    ingredients = request.args.get('ingredients')
    tags = request.args.get('tags')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, time_minutes, price, link FROM recipes')
    recipes = cursor.fetchall()

    result = []
    for recipe in recipes:
        cursor.execute('''
            SELECT i.id, i.name, ri.amount, ri.unit FROM ingredients i
            JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
            WHERE ri.recipe_id = ?
        ''', (recipe['id'],))
        recipe_ingredients = cursor.fetchall()

        cursor.execute('''
            SELECT t.id, t.name FROM tags t
            JOIN recipe_tags rt ON t.id = rt.tag_id
            WHERE rt.recipe_id = ?
        ''', (recipe['id'],))
        recipe_tags = cursor.fetchall()

        result.append({
            'id': recipe['id'],
            'title': recipe['title'],
            'time_minutes': recipe['time_minutes'],
            'price': recipe['price'],
            'link': recipe['link'] or '',
            'ingredients': [{'id': ing['id'], 'name': ing['name'], 'amount': ing['amount'], 'unit': ing['unit']} for ing in recipe_ingredients],
            'tags': [{'id': tag['id'], 'name': tag['name']} for tag in recipe_tags]
        })

    conn.close()
    return jsonify(result), 200

@app.route('/api/recipe/recipes/', methods=['POST'])
def recipe_recipes_create():
    print 'Route invoked: POST /api/recipe/recipes/'
    data = request.get_json()

    return jsonify({
        'id': 1,
        'title': data.get('title'),
        'time_minutes': data.get('time_minutes'),
        'price': data.get('price'),
        'link': data.get('link', ''),
        'tags': data.get('tags', []),
        'ingredients': data.get('ingredients', []),
        'description': data.get('description', '')
    }), 201

@app.route('/api/recipe/recipes/<int:id>/', methods=['GET'])
def recipe_recipes_retrieve(id):
    print 'Route invoked: GET /api/recipe/recipes/<int:id>/'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, time_minutes, price, link, description FROM recipes WHERE id = ' + str(id))
    recipe = cursor.fetchone()

    cursor.execute('''
        SELECT i.id, i.name, ri.amount, ri.unit FROM ingredients i
        JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = ''' + str(id))
    recipe_ingredients = cursor.fetchall()

    cursor.execute('''
        SELECT t.id, t.name FROM tags t
        JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE rt.recipe_id = ''' + str(id))
    recipe_tags = cursor.fetchall()

    conn.close()

    return jsonify({
        'id': recipe['id'],
        'title': recipe['title'],
        'time_minutes': recipe['time_minutes'],
        'price': recipe['price'],
        'link': recipe['link'] or '',
        'description': recipe['description'] or '',
        'ingredients': [{'id': ing['id'], 'name': ing['name'], 'amount': ing['amount'], 'unit': ing['unit']} for ing in recipe_ingredients],
        'tags': [{'id': tag['id'], 'name': tag['name']} for tag in recipe_tags]
    }), 200

@app.route('/api/recipe/recipes/<int:id>/', methods=['PUT'])
def recipe_recipes_update(id):
    print 'Route invoked: PUT /api/recipe/recipes/<int:id>/'
    data = request.get_json()

    return jsonify({
        'id': id,
        'title': data.get('title'),
        'time_minutes': data.get('time_minutes'),
        'price': data.get('price'),
        'link': data.get('link', ''),
        'tags': data.get('tags', []),
        'ingredients': data.get('ingredients', []),
        'description': data.get('description', '')
    }), 200

@app.route('/api/recipe/recipes/<int:id>/', methods=['PATCH'])
def recipe_recipes_partial_update(id):
    print 'Route invoked: PATCH /api/recipe/recipes/<int:id>/'
    data = request.get_json()

    response = {
        'id': id,
        'title': data.get('title', 'Sample Recipe'),
        'time_minutes': data.get('time_minutes', 30),
        'price': data.get('price', '10.00'),
        'link': data.get('link', ''),
        'tags': data.get('tags', []),
        'ingredients': data.get('ingredients', []),
        'description': data.get('description', '')
    }

    return jsonify(response), 200

@app.route('/api/recipe/recipes/<int:id>/', methods=['DELETE'])
def recipe_recipes_destroy(id):
    print 'Route invoked: DELETE /api/recipe/recipes/<int:id>/'
    return '', 204

@app.route('/api/recipe/recipes/<int:id>/upload-image/', methods=['POST'])
def recipe_recipes_upload_image(id):
    print 'Route invoked: POST /api/recipe/recipes/<int:id>/upload-image/'
    return jsonify({
        'id': id,
        'image': 'http://example.com/image.jpg'
    }), 200

@app.route('/api/recipe/ingredients/', methods=['GET'])
def recipe_ingredients_list():
    print 'Route invoked: GET /api/recipe/ingredients/'
    assigned_only = request.args.get('assigned_only')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM ingredients')
    ingredients = cursor.fetchall()
    conn.close()

    result = [{'id': ing['id'], 'name': ing['name']} for ing in ingredients]
    return jsonify(result), 200

@app.route('/api/recipe/ingredients/<int:id>/', methods=['PUT'])
def recipe_ingredients_update(id):
    print 'Route invoked: PUT /api/recipe/ingredients/<int:id>/'
    data = request.get_json()

    return jsonify({
        'id': id,
        'name': data.get('name')
    }), 200

@app.route('/api/recipe/ingredients/<int:id>/', methods=['PATCH'])
def recipe_ingredients_partial_update(id):
    print 'Route invoked: PATCH /api/recipe/ingredients/<int:id>/'
    data = request.get_json()

    return jsonify({
        'id': id,
        'name': data.get('name', 'Sample Ingredient')
    }), 200

@app.route('/api/recipe/ingredients/<int:id>/', methods=['DELETE'])
def recipe_ingredients_destroy(id):
    print 'Route invoked: DELETE /api/recipe/ingredients/<int:id>/'
    return '', 204

@app.route('/api/recipe/tags/', methods=['GET'])
def recipe_tags_list():
    print 'Route invoked: GET /api/recipe/tags/'
    assigned_only = request.args.get('assigned_only')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM tags')
    tags = cursor.fetchall()
    conn.close()

    result = [{'id': tag['id'], 'name': tag['name']} for tag in tags]
    return jsonify(result), 200

@app.route('/api/recipe/tags/<int:id>/', methods=['PUT'])
def recipe_tags_update(id):
    print 'Route invoked: PUT /api/recipe/tags/<int:id>/'
    data = request.get_json()

    return jsonify({
        'id': id,
        'name': data.get('name')
    }), 200

@app.route('/api/recipe/tags/<int:id>/', methods=['PATCH'])
def recipe_tags_partial_update(id):
    print 'Route invoked: PATCH /api/recipe/tags/<int:id>/'
    data = request.get_json()

    return jsonify({
        'id': id,
        'name': data.get('name', 'Sample Tag')
    }), 200

@app.route('/api/recipe/tags/<int:id>/', methods=['DELETE'])
def recipe_tags_destroy(id):
    print 'Route invoked: DELETE /api/recipe/tags/<int:id>/'
    return '', 204

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=3000, debug=True)
