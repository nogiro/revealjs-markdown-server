module Index exposing (main)

import Browser
import Html exposing (Html, text, div, button, a, ul, li, img)
import Html.Events exposing (onClick)
import Html.Attributes exposing (href, src, class)
import Json.Decode

main =
  Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }

-- MODEL

type alias FilledIndexItem =
  { path: String
  , thumbnail: String
  , original: IndexItem
  }

type alias IndexItem =
  { label: String
  , title: String
  , times:
    { atime: Int
    , mtime: Int
    , ctime: Int
    }
  }

type alias IndexMeta =
  { view_path: String
  , thumbnail_path: String
  , item_view_limit: Int
  , item_view_index: Int
  }

createIndexMeta : String -> String -> Maybe Int -> IndexMeta
createIndexMeta view_path thumbnail_path item_view_limit =
  { view_path = view_path
  , thumbnail_path = thumbnail_path
  , item_view_limit =
    case item_view_limit of
      Just x -> x
      _ -> 10
  , item_view_index = 0
  }

type alias IndexInfo =
  { meta: IndexMeta
  , slides: List IndexItem
  }

type Model
  = ParseOk IndexInfo
  | ParseError

fillIndexItem : IndexMeta -> IndexItem -> FilledIndexItem
fillIndexItem meta item =
  { path = (meta.view_path ++ "?label=" ++ item.label)
  , thumbnail = (meta.thumbnail_path ++ "?label=" ++ item.label)
  , original = item
  }

indexItemDecoder =
  Json.Decode.map3 IndexItem
    (Json.Decode.field "label" Json.Decode.string)
    (Json.Decode.field "title" Json.Decode.string)
    (Json.Decode.field "times"
      (Json.Decode.map3 (\x1 -> \x2 -> \x3 -> { atime = x1, mtime = x2, ctime = x3 })
        (Json.Decode.field "atime" Json.Decode.int)
        (Json.Decode.field "mtime" Json.Decode.int)
        (Json.Decode.field "ctime" Json.Decode.int)
      )
    )

indexInfoDecoder : Json.Decode.Decoder IndexInfo
indexInfoDecoder =
  Json.Decode.map2 IndexInfo
    (Json.Decode.field "meta"
      (Json.Decode.map3 createIndexMeta
        (Json.Decode.field "view_path" Json.Decode.string)
        (Json.Decode.field "thumbnail_path" Json.Decode.string)
        (Json.Decode.maybe (Json.Decode.field "item_view_limit" Json.Decode.int))
    ))
    (Json.Decode.field "slides" (Json.Decode.list indexItemDecoder))

init : String -> ( Model, Cmd Msg )
init flags =
  case (Json.Decode.decodeString indexInfoDecoder flags) of
    Ok a ->
      ( ParseOk a, Cmd.none )
    Err _ ->
      ( ParseError, Cmd.none )

-- UPDATE

type Msg =
   IncrementPagerIndex
   | DecrementPagerIndex

incrementPagerIndex : IndexInfo -> Model
incrementPagerIndex info =
  (\amount -> ParseOk {info | meta = (updateIndexInMeta info amount)})
  info.meta.item_view_limit

decrementPagerIndex : IndexInfo -> Model
decrementPagerIndex info =
  (\amount -> ParseOk {info | meta = (updateIndexInMeta info (0 - amount))})
  info.meta.item_view_limit

updateIndexInMeta : IndexInfo -> Int -> IndexMeta
updateIndexInMeta info amount =
  (\meta -> \max -> \a ->
    if (a < 0) || (max <= a) then
      meta
    else
      {meta | item_view_index = a}
  ) info.meta (List.length info.slides) (info.meta.item_view_index + amount)

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case model of
    ParseOk info ->
      case msg of
        IncrementPagerIndex -> ((incrementPagerIndex info), Cmd.none )
        DecrementPagerIndex -> ((decrementPagerIndex info), Cmd.none )
    ParseError -> (model, Cmd.none )

-- VIEW

view : Model -> Html Msg
view model =
  case model of
    ParseOk a ->
      div [ class "index" ]
        [ renderIndexPager a.meta.item_view_index (List.length a.slides) a.meta.item_view_limit
        , renderIndexList (List.map (fillIndexItem a.meta) a.slides)
        ]
    ParseError ->
      div [] [ text "json parse error" ]

renderIndexPager : Int -> Int -> Int -> Html Msg
renderIndexPager index max limit =
  div [ class "index__navigator" ]
    [ div [ class "index__navigator-spacer" ] []
    , div [ class "index__pager" ]
      [ button [ onClick DecrementPagerIndex, class "index__pager-button", class "index__pager-button--prev" ] [ text "<" ]
      , div [ class "index__pager-index " ] [ text ((String.fromInt index) ++ "/" ++ (String.fromInt max))]
      , button [ onClick IncrementPagerIndex, class "index__pager-button", class "index__pager-button--next" ] [ text ">" ]
      ]
    , div [ class "index__navigator-spacer" ] []
    ]

renderIndexList : List FilledIndexItem -> Html Msg
renderIndexList lst =
  case (List.length lst) of
    0 ->
      div [] [ text "no resources" ]
    _ ->
      div [ class "index__container" ] (List.map (\l -> renderIndexItem l) lst)

renderIndexItem : FilledIndexItem -> Html Msg
renderIndexItem item =
  div [ class "index__grid" ]
    [ a [ href item.path ]
      [ img [ src item.thumbnail, class "index__thumbnail" ] []
      , div [ class "index__label" ] [ text item.original.title ]
      ]
    ]

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

