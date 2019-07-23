module Bem exposing (createB, createBE, createBEM)

import Html exposing (Attribute)
import Html.Attributes exposing (class)

createB : String -> (List (Attribute a))
createB block =
  [ class block
  ]

createBE : String -> String -> (List (Attribute a))
createBE block element =
  [ class (block ++ "__" ++ element)
  ]

createBEM : String -> String -> String -> (List (Attribute a))
createBEM block element modifier =
  [ class (block ++ "__" ++ element)
  , class (block ++ "__" ++ element ++ "--" ++ modifier)
  ]

