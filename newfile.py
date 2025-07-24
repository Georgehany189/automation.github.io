import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from celery import Celery
import openai

load_dotenv() # Load environment variables from .env

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///agents.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Configure Celery
celery = Celery(
    app.name,
    broker=os.getenv('REDIS_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_BROKER_URL', 'redis://localhost:6379/0')
)
celery.conf.update(app.config)

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

# Database Model for AI Agents
class AIAgent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    purpose = db.Column(db.Text, nullable=False)
    automation_steps = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(50), default='pending') # e.g., 'pending', 'building', 'ready', 'failed'
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f'<AIAgent {self.name}>'

# Celery Task to build the AI Agent (simulated)
@celery.task
def build_ai_agent_task(agent_id: int):
    with app.app_context(): # Ensure Flask app context for DB operations
        agent = AIAgent.query.get(agent_id)
        if not agent:
            print(f"Agent with ID {agent_id} not found.")
            return

        agent.status = 'building'
        db.session.commit()
        print(f"Started building agent: {agent.name}")

        try:
            # --- AI Agent Building Logic ---
            # This is where you'd integrate with OpenAI, LangChain, LlamaIndex, etc.
            # Example: Generate a system prompt based on purpose
            system_prompt = f"You are an AI agent named {agent.name}. Your primary purpose is: {agent.purpose}. Follow these automation steps: {agent.automation_steps}"
            print(f"Generated system prompt for {agent.name}: {system_prompt}")

            # Simulate a call to an LLM
            # response = openai.chat.completions.create(
            #     model="gpt-4",
            #     messages=[
            #         {"role": "system", "content": system_prompt},
            #         {"role": "user", "content": "Initialize agent setup."}
            #     ]
            # )
            # print(f"LLM response for {agent.name}: {response.choices[0].message.content}")

            # Process automation_steps (e.g., execute code, call other APIs)
            # This would be a complex parser and executor for your JSON steps
            for step in agent.automation_steps:
                print(f"Executing step for {agent.name}: {step['action']}")
                # Example: If step['action'] == 'call_llm', make another OpenAI call
                # If step['action'] == 'save_data', interact with DB or external service
                import time
                time.sleep(2) # Simulate work

            agent.status = 'ready'
            print(f"Finished building agent: {agent.name}")

        except Exception as e:
            agent.status = 'failed'
            print(f"Error building agent {agent.name}: {e}")
        finally:
            db.session.commit()


# API Endpoint to create an AI Agent
@app.route('/api/create-agent', methods=['POST'])
def create_agent():
    data = request.json
    name = data.get('name')
    purpose = data.get('purpose')
    automation_steps = data.get('automation_steps')

    if not all([name, purpose, automation_steps]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        # Validate automation_steps as JSON
        import json
        automation_steps_json = json.loads(automation_steps)
    except json.JSONDecodeError:
        return jsonify({'error': 'Automation steps must be valid JSON'}), 400

    new_agent = AIAgent(
        name=name,
        purpose=purpose,
        automation_steps=automation_steps_json
    )
    db.session.add(new_agent)
    db.session.commit()

    # Dispatch the agent building task to Celery
    build_ai_agent_task.delay(new_agent.id)

    return jsonify({
        'message': 'Agent creation request received. Building in background.',
        'agent_id': new_agent.id,
        'status': new_agent.status
    }), 202 # 202 Accepted for asynchronous processing

# API Endpoint to get agent status (optional but recommended)
@app.route('/api/agents/<int:agent_id>', methods=['GET'])
def get_agent_status(agent_id):
    agent = AIAgent.query.get(agent_id)
    if not agent:
        return jsonify({'error': 'Agent not found'}), 404
    return jsonify({
        'id': agent.id,
        'name': agent.name,
        'status': agent.status,
        'purpose': agent.purpose,
        'created_at': agent.created_at.isoformat()
    })

if __name__ == '__main__':
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
