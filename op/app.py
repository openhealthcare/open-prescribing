"""
Flask application for OP.
"""
import collections
import functools
import json
import mimetypes
import os

import ffs
from flask import Flask, render_template, request, Response, abort

from op.db import r


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
        results = fn(*args,**kwargs)
        results = json.dumps(results)
        if  request.args.get('callback', None):
            return '{0}({1})'.format(request.args.get('callback'), results)
        else:
            return Response(results, mimetype='application/json')
    return with_callback_maybe

def stream_file(filename):

    def stream_wrapper(fn):

        @functools.wraps(fn)
        def streamer(*args, **kwargs):
            mime, _ = mimetypes.guess_type(filename)
            streamable = HERE / filename
            def generate():
                for row in streamable:
                    yield row
            return Response(generate(), mimetype=mime)
        return streamer

    return stream_wrapper


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

"""
Views
"""

@app.route("/")
def hello():
    return render_template('index.jinja2')

@app.route("/what")
def what():
    return render_template('what.jinja2')

@app.route("/why")
def why():
    return render_template('why.jinja2')

@app.route("/who")
def who():
    return render_template('who.jinja2')

@app.route("/api/doc")
def api_doc():
    return render_template('api.jinja2')

@app.route("/explore")
def explore():
    return render_template('explore.jinja2')

@app.route("/explore/drug/<bnf>")
def explore_drug(bnf):
    return render_template('explore.jinja2')


@app.route("/explore/ratio")
def explore_ratio():
    return render_template("explore_ratio.jinja2")

@app.route("/explore/ratio/<bucket1>/<bucket2>")
def explore_ratio_buckets(bucket1, bucket2):
    return render_template("explore_ratio.jinja2")

"""
Begin API
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

@app.route("/api/v2/prescriptionaggregates/")
@jsonp
def prescription_aggregates_api():
    query_type = request.args.get('query_type')
    bnf_code = request.args.get('bnf_code')
    if query_type not in ['practice', 'ccg']:
        raise UnknownQueryTypeError()

    print query_type, bnf_code

    agg = AGGREGATES / '{0}/bnf.{1}.json'.format(query_type, bnf_code)
    print agg
    aggregates = {}
    if agg:
        aggregates = agg.json_load()

    return dict(objects=aggregates)

@app.route("/api/v2/prescriptioncomparison/")
@jsonp
def prescription_comparison_api():
    query_type = request.args.get('query_type')
    group1 = request.args.get('group1')
    group2 = request.args.get('group2')

    print group1, group2
    bnfs1, bnfs2 = set(group1.split(',')), set(group2.split(','))

    print bnfs1, bnfs2

    aggs1 = [_get_aggregates(query_type, b) for b in bnfs1]
    aggs2 = [_get_aggregates(query_type, b) for b in bnfs2]

    def _sumit(aggregations):
        summer = collections.defaultdict(int)
        for drug in aggregations:
            for area in drug:
                summer[area] += drug[area]['count']
        return summer

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
