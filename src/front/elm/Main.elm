module Main exposing (main)

import Browser
import Html exposing (Html, text, div, a, ul, li)
import Html.Events exposing (onClick)
import Html.Attributes exposing (href)
import Json.Decode

main =
  Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }

-- MODEL

type alias IndexItem =
  { path: String, title: String }

type alias Model =
  List IndexItem

indexItemDecoder =
  Json.Decode.map2 IndexItem
    (Json.Decode.field "path" Json.Decode.string)
    (Json.Decode.field "title" Json.Decode.string)

modelDecoder : Json.Decode.Decoder Model
modelDecoder =
  Json.Decode.list indexItemDecoder

init : String -> ( Model, Cmd msg )
init flags =
  case (Json.Decode.decodeString modelDecoder flags) of
    Ok a ->
      ( a, Cmd.none )
    Err _ ->
      ( [], Cmd.none )

-- UPDATE

type Msg = Null

update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
  ( model, Cmd.none )

-- VIEW

view : Model -> Html Msg
view model =
  div []
    [ renderIndexList model
    ]

renderIndexList : List IndexItem -> Html msg
renderIndexList lst =
  case (List.length lst) of
    0 ->
      div [] [ text "no resources" ]
    _ ->
      ul [] (List.map (\l -> li [] [ renderIndexItem l ]) lst)

renderIndexItem : IndexItem -> Html msg
renderIndexItem item =
  li []
    [ a [ href item.path ] [ text item.title]
    ]

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

