from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

USER = {
    "id": 1,
    "name": "Juan dela Cruz",
    "email": "juan.delacruz@dar.gov.ph",
    "division": "PBD",
    "position": "Agrarian Reform Program Officer II",
    "joined": "2024-01-15"
}

COURSES = [
    {
        "id": 1, "code": "PBD-01", "session": 1,
        "title": "Enterprise-Based Community Organizing (e-CO) Skills",
        "shortTitle": "e-CO Skills", "division": "PBD",
        "description": "Learn enterprise-based community organizing skills for agrarian reform beneficiaries.",
        "progress": 100, "status": "completed", "duration": "45 minutes",
        "preTest": {"questions": 15, "completed": True, "score": 12},
        "postTest": {"questions": 20, "completed": True, "score": 18},
        "assignments": 3, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 2, "code": "PBD-02", "session": 2,
        "title": "Participatory Research and Planning",
        "shortTitle": "Research & Planning", "division": "PBD",
        "description": "Master participatory research methodologies for agrarian communities.",
        "progress": 100, "status": "completed", "duration": "60 minutes",
        "preTest": {"questions": 15, "completed": True, "score": 13},
        "postTest": {"questions": 20, "completed": True, "score": 19},
        "assignments": 3, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 3, "code": "PBD-03", "session": 3,
        "title": "Strategic Development Planning",
        "shortTitle": "Strategic Planning", "division": "PBD",
        "description": "Develop strategic plans for agrarian reform program implementation.",
        "progress": 60, "status": "in_progress", "duration": "90 minutes",
        "preTest": {"questions": 15, "completed": True, "score": 11},
        "postTest": {"questions": 20, "completed": False},
        "assignments": 3, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 4, "code": "PBD-04", "session": 4,
        "title": "Enterprise Development and Management",
        "shortTitle": "Enterprise Management", "division": "PBD",
        "description": "Learn enterprise development and management for agrarian reform.",
        "progress": 0, "status": "not_started", "duration": "75 minutes",
        "preTest": {"questions": 15, "completed": False},
        "postTest": {"questions": 20, "completed": False},
        "assignments": 3, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 5, "code": "LTS-01", "session": 1,
        "title": "EP/CLOA Processing",
        "shortTitle": "EP/CLOA Processing", "division": "LTS",
        "description": "Learn the processing of Emancipation Patent and Certificate of Land Ownership Award.",
        "progress": 0, "status": "not_started", "duration": "60 minutes",
        "preTest": {"questions": 15, "completed": False},
        "postTest": {"questions": 20, "completed": False},
        "assignments": 2, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 6, "code": "LTS-02", "session": 2,
        "title": "Land Acquisition and Distribution",
        "shortTitle": "Land Acquisition", "division": "LTS",
        "description": "Understand the process of land acquisition and distribution under CARP.",
        "progress": 0, "status": "not_started", "duration": "90 minutes",
        "preTest": {"questions": 15, "completed": False},
        "postTest": {"questions": 20, "completed": False},
        "assignments": 2, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 7, "code": "AJD-01", "session": 1,
        "title": "Mediation",
        "shortTitle": "Mediation", "division": "AJD",
        "description": "Learn mediation techniques for agrarian dispute resolution.",
        "progress": 0, "status": "not_started", "duration": "120 minutes",
        "preTest": {"questions": 15, "completed": False},
        "postTest": {"questions": 20, "completed": False},
        "assignments": 4, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 8, "code": "AJD-02", "session": 2,
        "title": "Adjudication Process",
        "shortTitle": "Adjudication", "division": "AJD",
        "description": "Understand the adjudication process for agrarian disputes.",
        "progress": 0, "status": "not_started", "duration": "90 minutes",
        "preTest": {"questions": 15, "completed": False},
        "postTest": {"questions": 20, "completed": False},
        "assignments": 3, "hasVideo": True, "hasDownloads": True
    },
    {
        "id": 9, "code": "Admin-01", "session": 1,
        "title": "Administrative Procedures and Protocols",
        "shortTitle": "Admin Procedures", "division": "Admin",
        "description": "Learn DAR administrative procedures, documentation, and protocols.",
        "progress": 0, "status": "not_started", "duration": "45 minutes",
        "preTest": {"questions": 10, "completed": False},
        "postTest": {"questions": 15, "completed": False},
        "assignments": 2, "hasVideo": True, "hasDownloads": True
    }
]

ANNOUNCEMENTS = [
    {
        "id": 1,
        "title": "New Training Module: Land Rights Education",
        "content": "A new training module on Land Rights Education has been added to the LTS section. All employees are encouraged to complete this module by the end of the month.",
        "date": "2024-03-15", "priority": "high", "author": "Training Office"
    },
    {
        "id": 2,
        "title": "Completion Deadline Reminder — March 31",
        "content": "Please be reminded that the deadline for completing PBD Sessions 1-4 is on March 31, 2024. Ensure all tasks and assessments are submitted on time.",
        "date": "2024-03-10", "priority": "medium", "author": "HR Department"
    },
    {
        "id": 3,
        "title": "System Maintenance: March 20, 12AM–4AM",
        "content": "The Online CapDev system will undergo maintenance on March 20, 2024 from 12:00 AM to 4:00 AM. Please save your progress before this period.",
        "date": "2024-03-08", "priority": "low", "author": "IT Support"
    },
    {
        "id": 4,
        "title": "Webinar: Sustainable Agrarian Reform Practices",
        "content": "Join us for an online webinar on March 25, 2024 at 9:00 AM. Registration link will be sent via email.",
        "date": "2024-03-05", "priority": "medium", "author": "Training Office"
    }
]


@app.route('/api/user', methods=['GET'])
def get_user():
    return jsonify(USER)


@app.route('/api/courses', methods=['GET'])
def get_courses():
    division = request.args.get('division')
    if division:
        return jsonify([c for c in COURSES if c['division'] == division])
    return jsonify(COURSES)


@app.route('/api/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    course = next((c for c in COURSES if c['id'] == course_id), None)
    if course:
        return jsonify(course)
    return jsonify({'error': 'Course not found'}), 404


@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    return jsonify(ANNOUNCEMENTS)


@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    total = len(COURSES)
    completed = len([c for c in COURSES if c['status'] == 'completed'])
    in_progress = len([c for c in COURSES if c['status'] == 'in_progress'])
    not_started = len([c for c in COURSES if c['status'] == 'not_started'])
    overall_progress = round(sum(c['progress'] for c in COURSES) / total, 1) if total else 0
    return jsonify({
        'total_courses': total,
        'completed': completed,
        'in_progress': in_progress,
        'not_started': not_started,
        'overall_progress': overall_progress,
        'courses': COURSES
    })


@app.route('/api/divisions', methods=['GET'])
def get_divisions():
    return jsonify(sorted(set(c['division'] for c in COURSES)))


if __name__ == '__main__':
    app.run(debug=True, port=5000)
