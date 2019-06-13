module Main exposing (main)

import Browser
import Html exposing (Html, text, div, a, ul, li, img)
import Html.Events exposing (onClick)
import Html.Attributes exposing (href, src)
import Json.Decode

main =
  Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }

-- MODEL

type alias FilledIndexItem =
  { path: String
  , thumbnail: String
  , label: String
  , title: String
  }

type alias IndexItem =
  { label: String
  , title: String
  }

type alias IndexMeta =
  { view_path: String
  , thumbnail_path: String
  }

type alias IndexInfo =
  { meta: IndexMeta
  , slides: List IndexItem
  }

type Model
  = ParseOk IndexInfo
  | ParseError

fillIndexItem : IndexMeta -> IndexItem -> FilledIndexItem
fillIndexItem meta slide =
  { path = (meta.view_path ++ "?label=" ++ slide.label)
  , thumbnail = (meta.thumbnail_path ++ "?label=" ++ slide.label)
  , label = slide.label
  , title = slide.title
  }

indexItemDecoder =
  Json.Decode.map2 IndexItem
    (Json.Decode.field "label" Json.Decode.string)
    (Json.Decode.field "title" Json.Decode.string)

indexInfoDecoder : Json.Decode.Decoder IndexInfo
indexInfoDecoder =
  Json.Decode.map2 IndexInfo
    (Json.Decode.field "meta"
      (Json.Decode.map2 IndexMeta
        (Json.Decode.field "view_path" Json.Decode.string)
        (Json.Decode.field "thumbnail_path" Json.Decode.string)
    ))
    (Json.Decode.field "slides" (Json.Decode.list indexItemDecoder))

init : String -> ( Model, Cmd msg )
init flags =
  case (Json.Decode.decodeString indexInfoDecoder flags) of
    Ok a ->
      ( ParseOk a, Cmd.none )
    Err _ ->
      ( ParseError, Cmd.none )

-- UPDATE

type Msg = Null

update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
  ( model, Cmd.none )

-- VIEW

view : Model -> Html Msg
view model =
  case model of
    ParseOk a ->
      div []
        [ renderIndexList (List.map (fillIndexItem a.meta) a.slides)
        ]
    ParseError ->
      div [] [ text "json parse error" ]

renderIndexList : List FilledIndexItem -> Html msg
renderIndexList lst =
  case (List.length lst) of
    0 ->
      div [] [ text "no resources" ]
    _ ->
      div []
      [ ul [] (List.map (\l -> renderIndexItem l) lst)
      ]

renderIndexItem : FilledIndexItem -> Html msg
renderIndexItem item =
  li []
    [ a [ href item.path ] [ text item.title ]
    , img [ src item.thumbnail ] []
    ]

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

