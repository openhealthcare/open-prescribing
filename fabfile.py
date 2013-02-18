import sys
import time

from fabric.api import *
from fabric.colors import red, green
import requests

web = ['ohc@horsell.scraperwiki.com']

serves = [
    'http://localhost:4567',
    ]

def manage(what):
    """
    Run a manage.py command

    Return: None
    Exceptions: None
    """
    with cd('/usr/local/ohc/scrip/nhs-prescriptions/nhs'):
        run('/home/ohc/.virtualenvs/scrip/bin/python manage.py {0}'.format(what))


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
        run('pkill gunicorn')
    with cd('/usr/local/ohc/scrip/nhs-prescriptions/nhs'):
        run('/home/ohc/.virtualenvs/scrip/bin/gunicorn_django -D -c gunicorn_conf.py')
    time.sleep(1) # Give it a second to start up
    for site in serves:
        req = requests.get(site)
        if req.status_code != 200:
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
