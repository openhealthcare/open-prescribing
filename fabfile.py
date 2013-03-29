import sys
import time

from fabric.api import *
from fabric.colors import red, green
import requests

web = ['ohc@horsell.scraperwiki.com']
PROJ_DIR = '/usr/local/ohc/scrip/nhs-prescriptions/nhs'
VENV_BIN = '/home/ohc/.virtualenvs/scrip/bin/{0}'
venv_bin = lambda x: VENV_BIN.format(x)
VENV_PY = venv_bin('python')

serves = [
    'http://www.openprescribing.org',
    ]

def manage(what):
    """
    Run a manage.py command

    Return: None
    Exceptions: None
    """
    with cd(PROJ_DIR):
        run('{0} manage.py {1}'.format(VENV_PY, what))

def migrate():
    """
    Update the database
    """
    manage('syncdb --migrate')

# def stop():
#     """
#     Stop the application in production
#     """
#     with cd(PROJ_DIR):
#         run('pkill gunicorn')

# @hosts(web)
# def start():
#     """
#     Start the application in production.
#     """
#     with cd(PROJ_DIR):
#         run('ls')
#         run('{0} -c {1}/gunicorn_conf.py -D'.format(venv_bin('gunicorn_django'), PROJ_DIR))

@hosts(web)
def reload():
    """
    Reload the gunicorn process
    """
    run('kill -HUP `cat /usr/local/ohc/var/op.pid`')

@hosts(web)
def deploy():
    """
    Make it so!

    Return: None
    Exceptions: None
    """
    # FIXME stop deploying out of git for atomicity.
    with cd('/usr/local/ohc/scrip/nhs-prescriptions'):
        run('git pull ohc master') #not ssh - key stuff
        run('/home/ohc/.virtualenvs/scrip/bin/pip install -r requirements.txt')
    migrate()

    # stop()
    # start()
    time.sleep(1) # Give it a second to start up
    for site in serves:
        req = requests.get(site)
        if req.status_code not in [200, 401]:
            print red("Cripes! something just blew up Larry! ({0})".format(site))
            sys.exit(1)
    print green("Deploy-o-rama!")


@hosts(web)
def migrate():
    """
    Update to latest please

    Return: None
    Exceptions: None
    """
    manage('syncdb')
    manage('migrate')
    manage('create_groups')

# @hosts(web)
# def restart():
#     """
#     Restart the application
#     """
#     stop()
#     start()
