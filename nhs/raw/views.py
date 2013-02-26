"""
Views to create Zipfiles of data for download
"""
from django.conf import settings
from django.http import HttpResponse
from django.views.generic import View

from nhs.raw import zippy

def serve_maybe(meth):
    """
    Decorator to figure out if we want to serve files
    ourselves (DEBUG) or hand off to Nginx
    """
    def handoff(self, *args, **kwargs):
        """
        Internal wrapper function to figure out
        the logic
        """
        filename = meth(self, *args, **kwargs)

        # When we're running locally, just take the hit, otherwise
        # offload the serving of the datafile to Nginx
        if settings.DEBUG:
            resp = HttpResponse(
                open(filename, 'rb').read(),
                mimetype='application/force-download'
                )
            return resp

        resp = HttpResponse()
        url = '/protected/{0}'.format(filename)
        # let nginx determine the correct content type
        resp['Content-Type']=""
        resp['X-Accel-Redirect'] = url
        return resp

    return handoff

class Ratio(View):
    """
    Build a file to contain the ratio of two buckets.
    """

    @serve_maybe
    def get(self, request, bucket1, bucket2):
        """
        Django boilerplate for serving a Zipfile containing the
        raw data for a ratio visualisation.

        Let the zippy module handle zipfile business logic, then
        either serve directly or hand off to Nginx.
        """
        filename = zippy.ratio(bucket1.split(','), bucket2.split(','))
        return filename

class Drug(View):
    """
    Build a file to contain the prescribing of a particular drug
    """

    @serve_maybe
    def get(self, request, bnf_code):
        """
        Django boilerplate for serving a Zipfile that we're creating on
        the fly.

        Let the zippy module do the file creation, then figure out
        whether we serve through Django or jus let Nginx know where
        we've put the file.
        """
        filename = zippy.drug(bnf_code)
        return filename
