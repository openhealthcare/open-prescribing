"""
Flask application for OP.
"""
import collections
import functools
try:
    import simplejson as json
except ImportError:
    import json
import os
import time
import urllib

import ffs
from flask import Flask, render_template, request, Response, abort, redirect

from op.constants import INHALE_CODES
from op.db import r
from op import constants, downloads

HERE = ffs.Path.here()
DATA = HERE / 'static/data'
AGGREGATES = DATA / 'aggregates'

def load_drugs():
    drugfile = DATA / 'drug.codes.names.csv'
    drugdict = {}
    bnfdict  = {}
    if not drugfile:
        return {}, {}

    with drugfile.csv(header=True) as csv:
        for drug in csv:
            drugdict[drug.name.upper()] = drug.bnf_code
            bnfdict[drug.bnf_code] = drug.name

    return drugdict, bnfdict

# We're just going to load all the drug names & codes into memory.
# It's < 1MB. Don't worry about it.
DRUGS, BNFS = load_drugs()
DRUG_NAMES = list(DRUGS.keys())

app = Flask(__name__)
app.config['DEBUG'] = True

"""
Helpers
"""

class Error(Exception): pass
class FileNotFoundError(Error): pass
class UnknownQueryTypeError(Error): pass

def jsonp(fn):
    @functools.wraps(fn)
    def with_callback_maybe(*args,**kwargs):
        results = json.dumps(fn(*args,**kwargs))
        if  request.args.get('callback', None):
            return '{0}({1})'.format(request.args.get('callback'), results)
        else:
            return Response(results, mimetype='application/json')
    return with_callback_maybe

def stream_file(filename):
    def stream_wrapper(fn):
        @functools.wraps(fn)
        def streamer(*args, **kwargs):
            streamable = HERE / filename
            def generate():
                for row in streamable:
                    yield row
            return Response(generate(), mimetype=streamable.mimetype)
        return streamer
    return stream_wrapper

def stream_generated_file(fname):
    """
    Given the name of a file we have just generated,
    stream it!

    Arguments:
    - `fname`: str

    Return: Response
    Exceptions: None
    """
    f = ffs.Path(fname)
    def generate():
        for row in f:
            yield row

    return Response(generate(), mimetype=f.mimetype)


def _get_aggregates(query_type, bnf_code):
    """
    Given a Query type and a bnf code, fetch the disk-stored
    aggregation for this drug at this granularity.
    """
    agg = AGGREGATES / '{0}/bnf.{1}.json'.format(query_type, bnf_code)
    aggregates = {}
    if agg:
        aggregates = agg.json_load()
    return aggregates


def json_template(tplname, **context):
    context['request'] = request
    return Response(
        render_template(tplname,**context),
        mimetype='application/json'
        )


"""
Views
"""
@app.route("/")
def hello():
    return render_template('index.jinja2')

@app.route("/what")
def what():
    return render_template('what.jinja2', nav='what')

@app.route("/why")
def why():
    return render_template('why.jinja2', nav='what')

@app.route("/who")
def who():
    return render_template('who.jinja2', nav='who')

@app.route("/api/doc")
def api_doc():
    return render_template('api.jinja2', nav='api')

@app.route("/explore")
def explore():
    return render_template('explore.jinja2', active='percapita', nav='explore')

@app.route("/explore/drug/<bnf>")
def explore_drug(bnf):
    return render_template('explore.jinja2', active='percapita', nav='explore')


@app.route("/explore/ratio")
def explore_ratio():
    return render_template("explore_ratio.jinja2", active='ratio', nav='explore')

@app.route("/explore/ratio/<bucket1>/<bucket2>")
def explore_ratio_buckets(bucket1, bucket2):
    b1, b2 = urllib.unquote(bucket1).split(','), urllib.unquote(bucket2).split(',')
    return render_template("explore_ratio.jinja2",
                           bnfs=BNFS, bucket1=b1, bucket2=b2,
                           active='ratio', nav='explore')

"""
Downloads
"""
@app.route("/raw/ratio/<bucket1>/<bucket2>/ratio.zip")
def download_ratio(bucket1, bucket2):
    b1, b2 = urllib.unquote(bucket1), urllib.unquote(bucket2)
    bucket = b1.split(',') + b2.split(',')
    return stream_generated_file(downloads.extract(bucket))

@app.route("/raw/drug/<bnf>/percap.zip")
def download_percapita(bnf):
    return stream_generated_file(downloads.extract([bnf]))


"""
API
"""

@app.route("/api/v2/drug/")
@jsonp
def drug_api():
    term = request.args.get('name__icontains').upper()
    limit = int(request.args.get('limit'))
    relevant_names = []
    found = 0
    for n in DRUG_NAMES:
        if found == limit:
            break
        if term in n:
            found += 1
            relevant_names.append(n)

    drugs = [dict(bnf_code=DRUGS[k], name=k) for k in relevant_names]
    return dict(objects=drugs)

@app.route("/api/v2/drug/<bnf>")
@jsonp
def drug_detail_api(bnf):
    if bnf in BNFS:
        return dict(bnf_code=bnf, name=BNFS[bnf])
    abort(404)

@app.route("/api/v2/practice/")
@stream_file("static/data/practicemetadata.json")
def practice_api(): pass

@app.route("/api/v2/ccgmetadata/")
@stream_file("static/data/ccgmetadata.json")
def ccg_api(): pass

def _sumit(aggregations):
    summer = collections.defaultdict(int)
    for drug in aggregations:
        for area in drug:
            summer[area] += drug[area]['count']
    return summer

SHORT_PATHS = {
    constants.ALL_INHALERS: 'inhalers',
    constants.ALL_STATINS: 'statins',
    constants.ALL_NICOTINE: 'nicotine'
    }

@app.route("/api/v2/prescriptionaggregates/")
@jsonp
def prescription_aggregates_api():
    query_type = request.args.get('query_type')
    raw_codes = urllib.unquote(request.args.get('bnf_codes'))
    bnf_codes = raw_codes.split(',')
    if query_type not in ['practice', 'ccg']:
        raise UnknownQueryTypeError()

    # We cache some queries that we promote on the site.
    # c.f. scripts/aggregate_short_paths.py
    if raw_codes in SHORT_PATHS:
        cachefile = DATA/SHORT_PATHS[raw_codes]/'{0}.aggregate.cache.json'.format(query_type)
        return dict(objects=cachefile.json_load())

    aggregations = []
    for code in bnf_codes:
        agg = AGGREGATES / '{0}/bnf.{1}.json'.format(query_type, code)
        aggregates = {}
        if agg:
            aggregates = agg.json_load()
        aggregations.append(aggregates)

    result = _sumit(aggregations)
    return dict(objects=result)

@app.route("/api/v2/prescriptioncomparison/")
@jsonp
def prescription_comparison_api():
    query_type = request.args.get('query_type')
    group1 = urllib.unquote(request.args.get('group1'))
    group2 = urllib.unquote(request.args.get('group2'))

    bnfs1, bnfs2 = set(group1.split(',')), set(group2.split(','))

    aggs1 = [_get_aggregates(query_type, b) for b in bnfs1]
    aggs2 = [_get_aggregates(query_type, b) for b in bnfs2]

    sum1 = _sumit(aggs1)
    sum2 = _sumit(aggs2)

    comparison = {}

    for area in sum1:
        total = sum1[area] + sum2[area]
        comp = dict(
            group1=dict(
                items=sum1[area],
                proportion=100 * sum1[area]/total
                ),
            group2=dict(
                items=sum2[area],
                proportion=100 * sum2[area]/total
                )
            )
        comparison[area] = comp

    return comparison

"""
API Documentation.
"""
@app.route('/api/v2/doc')
def apidoc():
    return render_template('apidoc.html')

@app.route("/api/v2/openprescribing")
def apidoc_base():
    return json_template("api/base.json.js")

@app.route("/api/v2/openprescribing/drug")
def apidoc_drug_api():
    return json_template("api/drug.json.js")

@app.route("/api/v2/openprescribing/practice")
def apidoc_practice_api():
    return json_template("api/practice.json.js")

@app.route("/api/v2/openprescribing/ccg")
def apidoc_ccg_api():
    return json_template("api/ccg.json.js")

@app.route("/api/v2/openprescribing/prescriptionaggregates")
def apidoc_prescriptionaggregates():
    return json_template("api/prescriptionaggregates.json.js")

@app.route("/api/v2/openprescribing/prescriptioncomparison")
def apidoc_prescriptioncomparison():
    return json_template("api/prescriptioncomparison.json.js")

"""
Backwards compatibility - These can't break :)
"""

@app.route('/example-inhalers')
def example_inhalers():
    codes = INHALE_CODES.replace('/', '')
    return redirect('/explore/drug/' + codes)

@app.route("/example-salbutamol")
def example_salbutamol():
    return redirect("/explore/drug/0301011R0AAAPAP")

@app.route("/example-hfc")
def example_hfc():
    return redirect("/explore/ratio"+INHALE_CODES)

"""
Shortcuts
"""
@app.route('/explore/inhalers-per-capita')
def short_inhalers_per_capita():
    return redirect("/explore/drug/"+constants.ALL_INHALERS)

@app.route('/explore/statins-per-capita')
def short_statins_per_capita():
    return redirect("/explore/drug/"+constants.ALL_STATINS)

@app.route('/explore/nicotine-per-capita')
def short_nicotine_per_capita():
    return redirect('/explore/drug/'+constants.ALL_NICOTINE)
