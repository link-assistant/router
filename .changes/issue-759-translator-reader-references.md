Keep shared-reference pointees and String/Vec ownership in reusable monomorphic
type identities. Standard slice get, first and last contracts now describe
Option<&T> separately from Option<T>, preserving nested references in checked
meta while using the existing portable runtime representation. Invalid
by-value reader results and callback inputs remain carried with source intact.
