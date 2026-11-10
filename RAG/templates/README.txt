How to use these templates
1. Copy a template to data/documents/<document_id>.md and name the file exactly like document_id.
2. Fill the header (the 'source' line becomes the citation) and replace every placeholder.
3. One document = one chapter or topic, 3 to 6 sections. Keep an exercise's statement and solution together.
4. Do not put other <!-- ... --> comments in the text. Only these are allowed:
     <!-- page: N -->            page number of what follows
     <!-- type: definition -->   switches content_type (course | exercise | definition)
5. Add a row to data/source_manifest.csv, set permission_verified=yes only after you checked the licence.
6. python ingest.py --strict   then   python evaluate.py
For an Arabic document: write the header in Latin letters exactly as shown, only the content in Arabic, language: ar.
Have an Arabic speaker or teacher read it.
